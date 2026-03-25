import math
import re
from collections import OrderedDict


SECTION_HEADINGS = OrderedDict(
    {
        "summary": {
            "summary",
            "professional summary",
            "profile",
            "objective",
            "career objective",
            "about",
        },
        "experience": {
            "experience",
            "work experience",
            "professional experience",
            "employment history",
        },
        "projects": {
            "projects",
            "project experience",
            "academic projects",
            "personal projects",
        },
        "education": {
            "education",
            "academic background",
            "qualifications",
        },
        "skills": {
            "skills",
            "technical skills",
            "core skills",
            "competencies",
            "technology stack",
        },
    }
)

ACTION_VERBS = {
    "achieved",
    "built",
    "created",
    "designed",
    "delivered",
    "developed",
    "drove",
    "enhanced",
    "executed",
    "implemented",
    "improved",
    "increased",
    "launched",
    "led",
    "managed",
    "optimized",
    "organized",
    "reduced",
    "resolved",
    "scaled",
}

GENERIC_ATS_KEYWORDS = {
    "analysis",
    "api",
    "automation",
    "collaboration",
    "communication",
    "customer",
    "dashboard",
    "data",
    "design",
    "development",
    "flask",
    "impact",
    "leadership",
    "performance",
    "planning",
    "problem-solving",
    "project",
    "python",
    "reporting",
    "results",
    "sql",
    "strategy",
    "team",
    "testing",
}

STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "to",
    "with",
    "your",
    "you",
}

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"(\+?\d[\d()\-\s]{7,}\d)")
URL_RE = re.compile(r"(https?://\S+|linkedin\.com/\S+|github\.com/\S+)", re.IGNORECASE)


def tokenize(text):
    return {
        token
        for token in re.findall(r"[a-zA-Z][a-zA-Z0-9+#./-]{2,}", text.lower())
        if token not in STOPWORDS
    }


def normalize_heading(line):
    return re.sub(r"[^a-z0-9 ]+", "", line.lower()).strip()


def identify_heading(line):
    normalized = normalize_heading(line)
    for section, headings in SECTION_HEADINGS.items():
        if normalized in headings:
            return section
    return None


def extract_contact_info(lines):
    top_lines = "\n".join(lines[:8])
    contacts = []
    first_line = next((line for line in lines if line.strip()), "")
    if first_line and len(first_line.split()) <= 5:
        contacts.append(first_line.strip())

    for regex in (EMAIL_RE, PHONE_RE, URL_RE):
        for match in regex.findall(top_lines):
            value = match[0] if isinstance(match, tuple) else match
            if value not in contacts:
                contacts.append(value)
    return "\n".join(contacts).strip()


def detect_sections(text):
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    sections = {key: [] for key in SECTION_HEADINGS}
    current_section = None

    for line in lines:
        heading = identify_heading(line)
        if heading:
            current_section = heading
            continue
        if current_section:
            sections[current_section].append(line)

    normalized_sections = {
        key: "\n".join(values).strip()
        for key, values in sections.items()
    }
    normalized_sections["contact_info"] = extract_contact_info(lines)
    return normalized_sections


def extract_bullet_candidates(*blocks):
    bullets = []
    for block in blocks:
        for line in (block or "").splitlines():
            cleaned = line.strip().lstrip("-*•").strip()
            if not cleaned:
                continue
            if line.lstrip().startswith(("-", "*", "•")) or 4 <= len(cleaned.split()) <= 30:
                bullets.append(cleaned)

    deduplicated = []
    seen = set()
    for bullet in bullets:
        lowered = bullet.lower()
        if lowered not in seen:
            deduplicated.append(bullet)
            seen.add(lowered)
    return deduplicated[:12]


def calculate_job_match(resume_text, job_description):
    if not job_description:
        return None, []

    resume_keywords = tokenize(resume_text)
    jd_keywords = tokenize(job_description)
    if not jd_keywords:
        return 0, []

    shared_keywords = sorted(jd_keywords.intersection(resume_keywords))
    ratio = len(shared_keywords) / max(len(jd_keywords), 1)
    return min(100, round(ratio * 100)), shared_keywords[:18]


def score_contact_info(contact_info):
    email_present = bool(EMAIL_RE.search(contact_info))
    phone_present = bool(PHONE_RE.search(contact_info))
    link_present = bool(URL_RE.search(contact_info))
    if email_present and phone_present and link_present:
        return 10
    if email_present and phone_present:
        return 8
    if email_present or phone_present:
        return 4
    return 0


def score_action_verbs(text):
    tokens = re.findall(r"[a-zA-Z]+", text.lower())
    found = {token for token in tokens if token in ACTION_VERBS}
    count = len(found)
    if count >= 8:
        return 10, count
    if count >= 5:
        return 8, count
    if count >= 3:
        return 6, count
    if count >= 1:
        return 3, count
    return 0, 0


def score_resume_length(word_count):
    if 250 <= word_count <= 900:
        return 10
    if 180 <= word_count < 250 or 900 < word_count <= 1050:
        return 7
    if 120 <= word_count < 180 or 1050 < word_count <= 1200:
        return 4
    return 1


def score_ats_keywords(tokens):
    hits = sorted(GENERIC_ATS_KEYWORDS.intersection(tokens))
    count = len(hits)
    if count >= 10:
        return 10, hits
    if count >= 7:
        return 8, hits
    if count >= 5:
        return 6, hits
    if count >= 3:
        return 4, hits
    return 1, hits


def score_formatting(text, sections, bullet_candidates):
    non_empty_sections = sum(1 for key in ("summary", "education", "skills", "projects", "experience") if sections.get(key))
    long_lines = [line for line in text.splitlines() if len(line.strip()) > 140]
    score = 1
    notes = []

    if non_empty_sections >= 4:
        score += 2
    else:
        notes.append("Add clearer section headings so recruiters can scan the resume faster.")

    if len(bullet_candidates) >= 4:
        score += 1
    else:
        notes.append("Use more bullet points for achievements instead of dense paragraphs.")

    if not long_lines:
        score += 1
    else:
        notes.append("Shorten overly long lines to improve readability and ATS parsing.")

    return min(score, 5), notes


def build_score_breakdown(sections, text, word_count, job_description):
    tokens = tokenize(text)
    bullet_candidates = extract_bullet_candidates(sections.get("experience"), sections.get("projects"))
    job_match_score, shared_job_keywords = calculate_job_match(text, job_description)

    action_verb_score, action_verbs_found = score_action_verbs(text)
    ats_score, ats_keywords = score_ats_keywords(tokens)
    formatting_score, formatting_notes = score_formatting(text, sections, bullet_candidates)

    breakdown = [
        {"key": "contact_info", "label": "Contact info present", "earned": score_contact_info(sections.get("contact_info", "")), "possible": 10},
        {"key": "summary", "label": "Summary / objective section", "earned": 5 if sections.get("summary") else 0, "possible": 5},
        {"key": "education", "label": "Education section", "earned": 10 if sections.get("education") else 0, "possible": 10},
        {"key": "skills", "label": "Skills section", "earned": 10 if sections.get("skills") else 0, "possible": 10},
        {"key": "projects", "label": "Projects section", "earned": 10 if sections.get("projects") else 0, "possible": 10},
        {"key": "experience", "label": "Experience section", "earned": 15 if sections.get("experience") else 0, "possible": 15},
        {"key": "action_verbs", "label": "Action verbs used", "earned": action_verb_score, "possible": 10},
        {"key": "length", "label": "Resume length", "earned": score_resume_length(word_count), "possible": 10},
        {"key": "ats_keywords", "label": "ATS-friendly keywords", "earned": ats_score, "possible": 10},
        {"key": "formatting", "label": "Formatting clarity", "earned": formatting_score, "possible": 5},
    ]

    if job_description:
        breakdown.append(
            {
                "key": "job_match",
                "label": "Job description match",
                "earned": min(5, math.ceil((job_match_score or 0) / 20)),
                "possible": 5,
            }
        )

    total_earned = sum(item["earned"] for item in breakdown)
    total_possible = sum(item["possible"] for item in breakdown)
    overall_score = round((total_earned / max(total_possible, 1)) * 100)

    keywords = {
        "ats_keywords_found": ats_keywords,
        "job_keywords_found": shared_job_keywords,
        "bullet_candidates": bullet_candidates,
    }
    return breakdown, overall_score, action_verbs_found, formatting_notes, keywords, job_match_score


def build_suggestions(sections, breakdown, word_count, formatting_notes, job_description, job_match_score, keywords):
    suggestions = []
    missing_sections = []

    for section_key in ("summary", "education", "skills", "projects", "experience"):
        if not sections.get(section_key):
            missing_sections.append(section_key)
            suggestions.append(f"Add a dedicated {section_key.replace('_', ' ')} section to make the resume easier to scan.")

    breakdown_map = {item["key"]: item for item in breakdown}

    if breakdown_map["contact_info"]["earned"] < 8:
        suggestions.append("Include a clear email address, phone number, and a professional LinkedIn or portfolio link.")

    if breakdown_map["action_verbs"]["earned"] < 6:
        suggestions.append("Rewrite achievements with strong action verbs such as built, improved, launched, or optimized.")

    if breakdown_map["length"]["earned"] < 7:
        if word_count < 250:
            suggestions.append("Add more role-specific achievements and project detail so the resume does not feel too thin.")
        else:
            suggestions.append("Trim repetitive or low-value content to keep the resume concise and recruiter-friendly.")

    if breakdown_map["ats_keywords"]["earned"] < 6:
        suggestions.append("Add more role-relevant keywords naturally into skills, project, and experience sections for ATS coverage.")

    for note in formatting_notes:
        if note not in suggestions:
            suggestions.append(note)

    if job_description and (job_match_score or 0) < 55:
        suggestions.append("Tailor the resume to the job description by echoing the same core skills, tools, and responsibilities.")

    if not keywords["ats_keywords_found"]:
        suggestions.append("Call out technical tools, business outcomes, and collaboration keywords more explicitly.")

    return suggestions[:8], missing_sections


def analyze_resume(text, job_description=""):
    cleaned_text = text.strip()
    word_count = len(cleaned_text.split())
    sections = detect_sections(cleaned_text)
    score_breakdown, score, action_verbs_found, formatting_notes, keywords, job_match_score = build_score_breakdown(
        sections,
        cleaned_text,
        word_count,
        job_description,
    )
    suggestions, missing_sections = build_suggestions(
        sections,
        score_breakdown,
        word_count,
        formatting_notes,
        job_description,
        job_match_score,
        keywords,
    )

    return {
        "score": score,
        "score_breakdown": score_breakdown,
        "suggestions": suggestions,
        "missing_sections": missing_sections,
        "sections": sections,
        "keywords": keywords,
        "action_verbs_found": action_verbs_found,
        "formatting_notes": formatting_notes,
        "job_match_score": job_match_score,
        "word_count": word_count,
    }
