BASE_GUARDRAILS = """
You are an expert resume editor helping a candidate strengthen their resume.

Rules:
- Preserve factual truth from the source text.
- Do not invent fake skills, fake experience, fake projects, fake dates, fake employers, fake titles, fake metrics, or fake achievements.
- If the source text is vague, improve wording without adding made-up specifics.
- Keep the writing professional, concise, ATS-friendly, and easy for recruiters to scan.
- Return plain text only. Do not use markdown fences.
""".strip()


ACTION_LABELS = {
    "improve_summary": "Improve Summary",
    "rewrite_bullets": "Rewrite Bullet Points",
    "improve_projects": "Improve Project Descriptions",
    "optimize_ats": "Optimize for ATS",
    "tailor_job_description": "Tailor to Job Description",
    "full_resume_enhancement": "Generate Improved Resume",
}


def summary_prompt(source_text, _job_description=""):
    return {
        "title": ACTION_LABELS["improve_summary"],
        "instructions": BASE_GUARDRAILS,
        "input": f"""
Task: Rewrite the resume summary or objective so it sounds sharper and more professional.

Constraints:
- Keep the meaning grounded in the source text.
- Keep it to 3 to 5 lines.
- Focus on role fit, value, and strengths.

Source summary:
{source_text}
""".strip(),
    }


def bullet_prompt(source_text, _job_description=""):
    return {
        "title": ACTION_LABELS["rewrite_bullets"],
        "instructions": BASE_GUARDRAILS,
        "input": f"""
Task: Rewrite these resume bullet points to sound stronger and more results-oriented.

Constraints:
- Preserve the same facts.
- Keep the same number of bullets whenever possible.
- Start each bullet with a strong action verb.
- Do not add metrics unless they already exist in the source.

Source bullet points:
{source_text}
""".strip(),
    }


def project_prompt(source_text, _job_description=""):
    return {
        "title": ACTION_LABELS["improve_projects"],
        "instructions": BASE_GUARDRAILS,
        "input": f"""
Task: Improve these project descriptions for clarity, impact, and ATS relevance.

Constraints:
- Keep the project facts truthful.
- Highlight tools, outcomes, and responsibilities already present.
- Use concise recruiter-friendly language.

Source project descriptions:
{source_text}
""".strip(),
    }


def tailor_prompt(source_text, job_description=""):
    return {
        "title": ACTION_LABELS["tailor_job_description"],
        "instructions": BASE_GUARDRAILS,
        "input": f"""
Task: Tailor this resume content to the job description.

Constraints:
- Reorder and rephrase the resume to match the job description better.
- Preserve factual truth and do not add experience the candidate does not have.
- Emphasize overlapping skills, tools, and responsibilities already present in the resume.

Resume content:
{source_text}

Job description:
{job_description}
""".strip(),
    }


def ats_prompt(source_text, _job_description=""):
    return {
        "title": ACTION_LABELS["optimize_ats"],
        "instructions": BASE_GUARDRAILS,
        "input": f"""
Task: Optimize this resume content for ATS readability and keyword clarity.

Constraints:
- Improve headings, phrasing, and keyword placement.
- Keep the text truthful and natural.
- Remove fluff and make content easier for both ATS systems and recruiters to scan.

Resume content:
{source_text}
""".strip(),
    }


def full_resume_prompt(source_text, job_description=""):
    optional_job_block = f"\nJob description:\n{job_description}\n" if job_description else ""
    return {
        "title": ACTION_LABELS["full_resume_enhancement"],
        "instructions": BASE_GUARDRAILS,
        "input": f"""
Task: Generate a polished improved version of this resume in plain text.

Constraints:
- Keep the same facts and only improve clarity, wording, structure, and ATS alignment.
- Use clear section headings.
- Keep the resume concise and professional.
- Do not invent achievements or qualifications.
{optional_job_block}
Resume content:
{source_text}
""".strip(),
    }


PROMPT_BUILDERS = {
    "improve_summary": summary_prompt,
    "rewrite_bullets": bullet_prompt,
    "improve_projects": project_prompt,
    "optimize_ats": ats_prompt,
    "tailor_job_description": tailor_prompt,
    "full_resume_enhancement": full_resume_prompt,
}
