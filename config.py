import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class Config:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5-mini")
    AI_MAX_INPUT_CHARS = int(os.getenv("AI_MAX_INPUT_CHARS", "16000"))
    AI_RATE_LIMIT_PER_MINUTE = int(os.getenv("AI_RATE_LIMIT_PER_MINUTE", "10"))
    MAX_CONTENT_LENGTH = 1 * 1024 * 1024
