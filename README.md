# Resume Analyzer AI

**Live demo → https://alexm2025.github.io/resume-analyzer-ai/**

A fast, private resume analyzer. Drop in a PDF, DOCX or text resume and get a recruiter-grade report in under two seconds: a six-part score, prioritized issues with evidence from your own text, job-description keyword gaps, a live editor that re-scores as you type, and AI rewrites that never invent facts.

Analysis runs **entirely in the browser**. Your resume is never uploaded anywhere unless you run an AI action.

## Features

| | |
|---|---|
| **Six-part score** | Impact, Structure, ATS readiness, Writing style, Skills, and Job match (when a job post is supplied), weighted into a 0–100 score and a letter grade. |
| **30+ checks** | Quantified bullets, action-verb openers, weak phrases ("responsible for", "worked on"), clichés, first-person pronouns, passive voice, repetitive verbs, bullet length, date-format consistency, contact details, section coverage, length, odd characters. |
| **Prioritized issues** | Critical / warning / tip, each with a why, a how-to-fix, and the exact lines from your resume. |
| **Highlighted resume** | Your text with weak phrases, clichés, pronouns, passive voice, metrics, action verbs and job keywords marked inline. Each highlight type can be toggled. |
| **Job match** | Paste a job post to see the match %, matched vs. missing keywords, years-of-experience and degree checks. |
| **Live editor** | Edit the text and watch every category re-score as you type. Save as a new version and see the +/- delta. |
| **Bullet fixer** | Instant rule-based rewrites for weak bullets, with no AI key needed. |
| **AI studio** | Rewrite bullets, sharpen the summary, tailor to a job, optimize for ATS, full rewrite, cover letter, interview prep, polish projects. Before/after compare, copy, download, and "score this version". |
| **History** | Every report is saved locally with a score-over-time chart. |
| **Export** | Print-ready PDF report and JSON export. |
| **Polish** | Light/dark themes, fully responsive, keyboard accessible, reduced-motion support. |

## How AI works

AI actions call OpenAI in one of two ways:

1. **Your own key (static hosting / GitHub Pages).** Open **Settings** and paste an OpenAI API key. It is stored only in your browser's localStorage and sent directly to `api.openai.com`.
2. **Server key (self-hosted Flask).** Set `OPENAI_API_KEY` on the server. The app detects `/api/health` and routes AI calls through `/api/ai`, so users never see the key. The server rate-limits requests per IP.

All prompts live in [`web/prompts.json`](web/prompts.json) and are shared by the browser and the server. Every prompt forbids inventing skills, employers, dates or metrics, and uses placeholders like `[X%]` where a real number should go.

## Project structure

```text
web/                  Static app (deployed to GitHub Pages as-is, no build step)
  index.html
  css/app.css
  js/analyzer.js      Scoring engine: pure functions, runs in browser and Node
  js/parser.js        PDF (pdf.js) / DOCX (mammoth) / TXT extraction
  js/ai.js            AI provider layer (server proxy or bring-your-own-key)
  js/store.js         localStorage persistence
  js/app.js           UI, routing, views
  js/sample.js        Sample resume and job description
  prompts.json        Shared AI prompt definitions
server/__init__.py    Optional Flask backend: serves web/ and the AI proxy
app.py                Flask entry point
tests/                Node tests for the analyzer, pytest for the server
```

## Run locally

Static only (no AI key on the server):

```bash
cd web && python -m http.server 8000
# open http://localhost:8000
```

With the Flask backend:

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
copy .env.example .env          # optionally add OPENAI_API_KEY
python app.py                   # http://127.0.0.1:5000
```

## Tests

```bash
node --test tests/analyzer.test.mjs
pip install pytest && python -m pytest -q tests
```

## Deployment

GitHub Actions (`.github/workflows/ci.yml`) runs both test suites on every push and PR. On pushes to `main` it publishes `web/` to the `gh-pages` branch, which GitHub Pages serves.
