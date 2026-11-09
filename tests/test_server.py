import pytest

from config import Config
from server import create_app


class TestConfig(Config):
    TESTING = True
    OPENAI_API_KEY = "test-key"
    AI_RATE_LIMIT_PER_MINUTE = 3


@pytest.fixture
def calls():
    return []


@pytest.fixture
def client(calls):
    def fake_generate(_app, instructions, user_input):
        calls.append((instructions, user_input))
        return "- Improved bullet"

    return create_app(TestConfig, generate=fake_generate).test_client()


def test_serves_web_app(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert b"Resume Analyzer" in resp.data
    assert client.get("/js/analyzer.js").status_code == 200
    assert client.get("/prompts.json").status_code == 200


def test_path_traversal_blocked(client):
    assert client.get("/../config.py").status_code == 404


def test_health_reports_ai(client):
    data = client.get("/api/health").get_json()
    assert data["ok"] is True and data["ai"] is True


def test_ai_happy_path(client, calls):
    resp = client.post("/api/ai", json={"action": "rewrite_bullets", "text": "- Worked on the API"})
    assert resp.status_code == 200
    assert resp.get_json()["text"] == "- Improved bullet"
    instructions, user_input = calls[0]
    assert "Never invent" in instructions
    assert "Worked on the API" in user_input


def test_ai_validation(client):
    assert client.post("/api/ai", json={"action": "nope", "text": "x"}).status_code == 400
    assert client.post("/api/ai", json={"action": "rewrite_bullets", "text": "  "}).status_code == 400
    assert client.post("/api/ai", json={"action": "cover_letter", "text": "resume"}).status_code == 400


def test_rate_limit(client):
    for _ in range(3):
        assert client.post("/api/ai", json={"action": "rewrite_bullets", "text": "x"}).status_code == 200
    assert client.post("/api/ai", json={"action": "rewrite_bullets", "text": "x"}).status_code == 429


def test_ai_disabled_without_key():
    class NoKey(Config):
        OPENAI_API_KEY = None

    c = create_app(NoKey).test_client()
    assert c.get("/api/health").get_json()["ai"] is False
    assert c.post("/api/ai", json={"action": "rewrite_bullets", "text": "x"}).status_code == 503
