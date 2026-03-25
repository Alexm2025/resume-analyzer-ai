import json
import uuid

from flask import Blueprint, current_app, flash, g, redirect, render_template, request, url_for
from werkzeug.utils import secure_filename

from .db import execute_db, query_db
from .decorators import login_required
from .services.analyzer import analyze_resume
from .services.pdf_service import extract_text_from_pdf


bp = Blueprint("resumes", __name__)
ALLOWED_EXTENSIONS = {"pdf"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def get_report_or_404(report_id, user_id):
    return query_db(
        """
        SELECT
            ar.*,
            ur.original_filename,
            ur.file_path,
            ur.extracted_text,
            ur.word_count,
            ur.created_at AS uploaded_at,
            ur.id AS resume_id
        FROM analysis_reports ar
        JOIN uploaded_resumes ur ON ur.id = ar.resume_id
        WHERE ar.id = ? AND ar.user_id = ?
        """,
        (report_id, user_id),
        one=True,
    )


@bp.route("/upload", methods=("GET", "POST"))
@login_required
def upload_resume():
    if request.method == "POST":
        uploaded_file = request.files.get("resume_file")
        job_description = request.form.get("job_description", "").strip()

        if uploaded_file is None or uploaded_file.filename == "":
            flash("Please choose a resume PDF to upload.", "error")
            return redirect(url_for("resumes.upload_resume"))

        if not allowed_file(uploaded_file.filename):
            flash("Only PDF files are supported.", "error")
            return redirect(url_for("resumes.upload_resume"))

        original_filename = secure_filename(uploaded_file.filename)
        stored_filename = f"{uuid.uuid4().hex}_{original_filename}"
        file_path = current_app.config["UPLOAD_FOLDER"] / stored_filename
        uploaded_file.save(file_path)

        try:
            extracted_text = extract_text_from_pdf(file_path)
        except ValueError as exc:
            file_path.unlink(missing_ok=True)
            flash(str(exc), "error")
            return redirect(url_for("resumes.upload_resume"))

        analysis = analyze_resume(extracted_text, job_description=job_description)
        resume_id = execute_db(
            """
            INSERT INTO uploaded_resumes (
                user_id,
                original_filename,
                stored_filename,
                file_path,
                extracted_text,
                word_count
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                g.user["id"],
                original_filename,
                stored_filename,
                str(file_path),
                extracted_text,
                analysis["word_count"],
            ),
        )
        report_id = execute_db(
            """
            INSERT INTO analysis_reports (
                resume_id,
                user_id,
                score,
                score_breakdown,
                missing_sections,
                suggestions,
                detected_sections,
                keywords,
                action_verbs_found,
                formatting_notes,
                job_description,
                job_match_score
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                resume_id,
                g.user["id"],
                analysis["score"],
                json.dumps(analysis["score_breakdown"]),
                json.dumps(analysis["missing_sections"]),
                json.dumps(analysis["suggestions"]),
                json.dumps(analysis["sections"]),
                json.dumps(analysis["keywords"]),
                analysis["action_verbs_found"],
                json.dumps(analysis["formatting_notes"]),
                job_description or None,
                analysis["job_match_score"],
            ),
        )
        flash("Resume uploaded and analyzed successfully.", "success")
        return redirect(url_for("resumes.analysis_result", report_id=report_id))

    return render_template("upload.html")


@bp.route("/analysis/<int:report_id>")
@login_required
def analysis_result(report_id):
    report = get_report_or_404(report_id, g.user["id"])
    if report is None:
        flash("That analysis report was not found.", "error")
        return redirect(url_for("main.dashboard"))

    score_breakdown = json.loads(report["score_breakdown"])
    suggestions = json.loads(report["suggestions"])
    sections = json.loads(report["detected_sections"])
    missing_sections = json.loads(report["missing_sections"])
    keywords = json.loads(report["keywords"])
    formatting_notes = json.loads(report["formatting_notes"])
    improvements = query_db(
        """
        SELECT *
        FROM ai_improvements
        WHERE report_id = ? AND user_id = ?
        ORDER BY created_at DESC
        """,
        (report_id, g.user["id"]),
    )

    bullet_source = "\n".join(keywords.get("bullet_candidates", []))
    return render_template(
        "analysis.html",
        report=report,
        score_breakdown=score_breakdown,
        suggestions=suggestions,
        sections=sections,
        missing_sections=missing_sections,
        keywords=keywords,
        formatting_notes=formatting_notes,
        bullet_source=bullet_source,
        improvements=improvements,
    )
