"""Optional Flask backend.

Serves the static web app and exposes a small AI proxy so the OpenAI key can live
on the server instead of in each user's browser. Resume analysis itself always runs
client-side, so this server never stores resumes.
"""

import json
import logging
import time
from collections import defaultdict, deque
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from config import Config

logger = logging.getLogger(__name__)
WEB_DIR = Path(__file__).resolve().parent.parent / "web"


def load_prompts():
    with open(WEB_DIR / "prompts.json", encoding="utf-8") as fh:
        return json.load(fh)


def build_prompt(prompts, action, text, job_description=""):
    spec = prompts["actions"][action]
    parts = [f"Task: {spec['task']}", "", "Constraints:"]
    parts += [f"- {c}" for c in spec["constraints"]]
    parts += ["", "Resume content:", text.strip()]
    if job_description.strip():
        parts += ["", "Job description:", job_description.strip()]
    return prompts["guardrails"], "\n".join(parts)


class RateLimiter:
    """Tiny in-memory sliding-window limiter, keyed by client IP."""

    def __init__(self, limit, window_seconds=60):
        self.limit = limit
        self.window = window_seconds
        self.hits = defaultdict(deque)

    def allow(self, key):
        now = time.monotonic()
        q = self.hits[key]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) >= self.limit:
            return False
        q.append(now)
        return True


def default_generate(app, instructions, user_input):
    from openai import OpenAI

    client = OpenAI(api_key=app.config["OPENAI_API_KEY"])
    response = client.responses.create(
        model=app.config["OPENAI_MODEL"],
        instructions=instructions,
        input=user_input,
        store=False,
    )
    return (response.output_text or "").strip()


def create_app(config_class=Config, generate=None):
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_class)
    prompts = load_prompts()
    limiter = RateLimiter(app.config["AI_RATE_LIMIT_PER_MINUTE"])
    generate = generate or default_generate

    @app.get("/api/health")
    def health():
        return jsonify(ok=True, ai=bool(app.config.get("OPENAI_API_KEY")), model=app.config["OPENAI_MODEL"])

    @app.post("/api/ai")
    def ai():
        if not app.config.get("OPENAI_API_KEY"):
            return jsonify(error="AI is not configured on this server. Set OPENAI_API_KEY."), 503

        client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip()
        if not limiter.allow(client_ip):
            return jsonify(error="Too many AI requests. Please wait a minute and try again."), 429

        data = request.get_json(silent=True) or {}
        action = data.get("action")
        text = str(data.get("text") or "")
        job_description = str(data.get("job_description") or "")

        if action not in prompts["actions"]:
            return jsonify(error="Unknown AI action."), 400
        if not text.strip():
            return jsonify(error="There is no resume text to work with."), 400
        if prompts["actions"][action].get("needsJD") and not job_description.strip():
            return jsonify(error="This action needs a job description."), 400

        max_chars = app.config["AI_MAX_INPUT_CHARS"]
        instructions, user_input = build_prompt(prompts, action, text[:max_chars], job_description[:8000])
        try:
            output = generate(app, instructions, user_input)
        except Exception:  # noqa: BLE001 - surface a clean message, log the detail
            logger.exception("AI generation failed")
            return jsonify(error="AI generation failed. Check the server's API key and model access."), 502
        if not output:
            return jsonify(error="The model returned an empty response."), 502
        return jsonify(text=output)

    @app.get("/")
    def index():
        return send_from_directory(WEB_DIR, "index.html")

    @app.get("/<path:path>")
    def static_files(path):
        return send_from_directory(WEB_DIR, path)

    @app.after_request
    def security_headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        return resp

    return app
