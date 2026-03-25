import logging
import re

import pdfplumber
from PyPDF2 import PdfReader


logger = logging.getLogger(__name__)


def normalize_text(text):
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_text_from_pdf(file_path):
    extracted_pages = []

    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                if page_text.strip():
                    extracted_pages.append(page_text)
    except Exception as exc:
        logger.warning("pdfplumber extraction failed for %s: %s", file_path, exc)

    extracted_text = "\n\n".join(extracted_pages).strip()
    if extracted_text:
        return normalize_text(extracted_text)

    try:
        reader = PdfReader(str(file_path))
        fallback_pages = []
        for page in reader.pages:
            page_text = page.extract_text() or ""
            if page_text.strip():
                fallback_pages.append(page_text)
        extracted_text = "\n\n".join(fallback_pages).strip()
    except Exception as exc:
        raise ValueError("We could not extract readable text from this PDF.") from exc

    if not extracted_text:
        raise ValueError("This PDF appears to contain no selectable text.")

    return normalize_text(extracted_text)
