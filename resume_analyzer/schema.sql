CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploaded_resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    extracted_text TEXT NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analysis_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    score_breakdown TEXT NOT NULL,
    missing_sections TEXT NOT NULL,
    suggestions TEXT NOT NULL,
    detected_sections TEXT NOT NULL,
    keywords TEXT NOT NULL,
    action_verbs_found INTEGER NOT NULL DEFAULT 0,
    formatting_notes TEXT NOT NULL,
    job_description TEXT,
    job_match_score INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES uploaded_resumes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_improvements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    resume_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    title TEXT NOT NULL,
    original_text TEXT NOT NULL,
    improved_text TEXT NOT NULL,
    job_description TEXT,
    generated_file_path TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES analysis_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (resume_id) REFERENCES uploaded_resumes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_uploaded_resumes_user_id ON uploaded_resumes (user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_user_id ON analysis_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_resume_id ON analysis_reports (resume_id);
CREATE INDEX IF NOT EXISTS idx_ai_improvements_report_id ON ai_improvements (report_id);
