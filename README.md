# Resume Analyzer AI

Resume Analyzer AI is a small production-style SaaS MVP built with Flask, SQLite, HTML, CSS, and JavaScript. Users can create an account, upload a resume PDF, extract its text, analyze section coverage, score ATS readiness, save history, and run AI-powered rewriting features using the OpenAI API.

## Features

- Landing page with SaaS-style UI
- User signup, login, and logout
- Secure PDF upload handling
- PDF text extraction with `pdfplumber` and `PyPDF2` fallback
- Resume section detection for:
  - Contact Info
  - Summary / Objective
  - Education
  - Skills
  - Projects
  - Experience
- Resume scoring out of 100
- Suggestions engine for missing sections and weak spots
- Dashboard and history views
- SQLite storage for users, uploads, analysis reports, and AI improvements
- OpenAI-powered improvements for:
  - professional summary rewriting
  - bullet point rewriting
  - project description improvement
  - ATS optimization
  - job-description tailoring
  - full improved resume generation
- Side-by-side original vs improved comparison
- Generated improved resume text files saved into the `generated/` folder

## Folder Structure

```text
Resume Analyzer AI/
  app.py
  config.py
  requirements.txt
  .env.example
  README.md
  instance/
  uploads/
  generated/
  resume_analyzer/
    __init__.py
    db.py
    schema.sql
    decorators.py
    auth.py
    main.py
    resumes.py
    ai_routes.py
    services/
      pdf_service.py
      analyzer.py
      ai_prompts.py
      ai_helper.py
  templates/
    base.html
    landing.html
    dashboard.html
    upload.html
    analysis.html
    ai_improvements.html
    history.html
    auth/
      login.html
      signup.html
  static/
    css/style.css
    js/main.js
```

## Database Tables

The SQLite schema creates these tables:

- `users`
- `uploaded_resumes`
- `analysis_reports`
- `ai_improvements`

## Scoring Rules

The analyzer currently scores these criteria:

- Contact info present
- Summary / objective section present
- Education section present
- Skills section present
- Projects section present
- Experience section present
- Action verbs used
- Resume length is reasonable
- ATS-friendly keywords found
- Formatting clarity
- Job-description match when a job description is supplied

The app normalizes the score to `0-100`, even when job-description scoring is optional.

## AI Prompt Design

Prompt templates live in `resume_analyzer/services/ai_prompts.py`.

Each prompt enforces these rules:

- preserve factual truth
- never invent fake skills, experience, dates, metrics, or achievements
- improve wording, clarity, professionalism, and ATS relevance
- return plain text for clean UI rendering

## Local Setup

1. Create and activate a virtual environment.

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

2. Install dependencies.

```bash
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` and add your values.

Required environment variables:

- `SECRET_KEY`
- `OPENAI_API_KEY`

Optional:

- `OPENAI_MODEL` defaults to `gpt-5-mini`
- `AI_MAX_INPUT_CHARS` defaults to `16000`

4. Run the app.

```bash
flask --app app run
```

Or:

```bash
python app.py
```

5. Open the app in your browser:

```text
http://127.0.0.1:5000
```

## Usage Flow

1. Sign up or log in.
2. Upload a resume PDF.
3. Optionally paste a job description before analysis.
4. Review extracted text, score, sections, keywords, and suggestions.
5. Run AI actions from the analysis page or the dedicated AI workspace.
6. Compare original and improved content side by side.
7. Download the generated improved resume text file if needed.
8. Revisit old reports from the dashboard or history page.

## Notes

- Uploaded files are stored in `uploads/`.
- Generated improved resume text files are stored in `generated/`.
- The database file is created automatically in `instance/resume_analyzer.db`.
- If the OpenAI API key is missing or the API call fails, the app shows a clear error message instead of breaking the page.
