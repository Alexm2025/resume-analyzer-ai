import logging

from flask import current_app
from openai import OpenAI

from .ai_prompts import ACTION_LABELS, PROMPT_BUILDERS


logger = logging.getLogger(__name__)


def generate_improvement(action, source_text, job_description=""):
    api_key = current_app.config.get("OPENAI_API_KEY")
    if not api_key:
        return {
            "ok": False,
            "error": "AI generation is unavailable because OPENAI_API_KEY is not set.",
        }

    if action not in PROMPT_BUILDERS:
        return {
            "ok": False,
            "error": "Unsupported AI action requested.",
        }

    if not source_text.strip():
        return {
            "ok": False,
            "error": "There is not enough resume text available for that AI action.",
        }

    if action == "tailor_job_description" and not job_description.strip():
        return {
            "ok": False,
            "error": "Please add a job description before using the tailoring feature.",
        }

    max_chars = current_app.config.get("AI_MAX_INPUT_CHARS", 16000)
    prompt_data = PROMPT_BUILDERS[action](source_text[:max_chars], job_description[:max_chars])

    try:
        client = OpenAI(api_key=api_key)
        response = client.responses.create(
            model=current_app.config.get("OPENAI_MODEL", "gpt-5-mini"),
            instructions=prompt_data["instructions"],
            input=prompt_data["input"],
            store=False,
        )
        output_text = (response.output_text or "").strip()
        if not output_text:
            raise ValueError("The model returned an empty response.")
        return {
            "ok": True,
            "title": prompt_data["title"],
            "text": output_text,
        }
    except Exception as exc:
        logger.exception("OpenAI generation failed: %s", exc)
        return {
            "ok": False,
            "error": "AI generation is currently unavailable. Check your API key, model access, and internet connection, then try again.",
        }


__all__ = ["ACTION_LABELS", "generate_improvement"]
