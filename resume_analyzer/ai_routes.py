import json
import re
from datetime import datetime
from pathlib import Path

from flask import Blueprint, current_app, flash, g, redirect, render_template, request, send_file, url_for

from .db import execute_db, query_db
from .decorators import login_required
from .resumes import get_report_or_404
from .services.ai_helper import ACTION_LABELS, generate_improvement


bp = Blueprint("ai", __name__, url_prefix="/ai")


def build_default_source_text(action, report, sections, keywords):
    if action == "improve_summary":
        return sections.get("summary") or report["extracted_text"][:1200]
    if action == "rewrite_bullets":
        bullets = keywords.get("bullet_candidates", [])
        return "\n".join(bullets) if bullets else sections.get("experience") or report["extracted_text"][:2000]
    if action == "improve_projects":
        return sections.get("projects") or report["extracted_text"][:1800]
    return report["extracted_text"]


def save_generated_resume(report, improved_text):
    safe_stem = re.sub(r"[^a-zA-Z0-9_-]+", "_", Path(report["original_filename"]).stem).strip("_") or "resume"
    filename = f"{safe_stem}_improved_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.txt"
    target_path = current_app.config["GENERATED_FOLDER"] / filename
    target_path.write_text(improved_text, encoding="utf-8")
    return target_path


@bp.route("/report/<int:report_id>")
@login_required
def improvement_workspace(report_id):
    report = get_report_or_404(report_id, g.user["id"])
    if report is None:
        flash("That AI workspace could not be found.", "error")
        return redirect(url_for("main.dashboard"))

    sections = json.loads(report["detected_sections"])
    keywords = json.loads(report["keywords"])
    improvements = query_db(
        """
        SELECT *
        FROM ai_improvements
        WHERE report_id = ? AND user_id = ?
        ORDER BY created_at DESC
        """,
        (report_id, g.user["id"]),
    )

    default_sources = {
        action: build_default_source_text(action, report, sections, keywords)
        for action in ACTION_LABELS
    }
    return render_template(
        "ai_improvements.html",
        report=report,
        sections=sections,
        improvements=improvements,
        default_sources=default_sources,
    )


@bp.route("/report/<int:report_id>/generate/<string:action>", methods=("POST",))
@login_required
def generate_action(report_id, action):
    report = get_report_or_404(report_id, g.user["id"])
    if report is None:
        flash("That analysis report was not found.", "error")
        return redirect(url_for("main.dashboard"))

    sections = json.loads(report["detected_sections"])
    keywords = json.loads(report["keywords"])
    source_text = request.form.get("source_text", "").strip() or build_default_source_text(action, report, sections, keywords)
    job_description = request.form.get("job_description", "").strip() or (report["job_description"] or "")

    result = generate_improvement(
        action=action,
        source_text=source_text,
        job_description=job_description,
    )
    if not result["ok"]:
        flash(result["error"], "error")
        return redirect(request.referrer or url_for("ai.improvement_workspace", report_id=report_id))

    generated_file_path = None
    if action == "full_resume_enhancement":
        generated_file_path = save_generated_resume(report, result["text"])

    execute_db(
        """
        INSERT INTO ai_improvements (
            report_id,
            resume_id,
            user_id,
            action_type,
            title,
            original_text,
            improved_text,
            job_description,
            generated_file_path
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            report_id,
            report["resume_id"],
            g.user["id"],
            action,
            result["title"],
            source_text,
            result["text"],
            job_description or None,
            str(generated_file_path) if generated_file_path else None,
        ),
    )
    flash(f"{ACTION_LABELS.get(action, 'AI improvement')} completed successfully.", "success")
    return redirect(url_for("ai.improvement_workspace", report_id=report_id))


@bp.route("/download/<int:improvement_id>")
@login_required
def download_generated_resume(improvement_id):
    improvement = query_db(
        """
        SELECT *
        FROM ai_improvements
        WHERE id = ? AND user_id = ?
        """,
        (improvement_id, g.user["id"]),
        one=True,
    )
    if improvement is None or not improvement["generated_file_path"]:
        flash("Generated resume file not found.", "error")
        return redirect(url_for("main.dashboard"))

    path = Path(improvement["generated_file_path"])
    if not path.exists():
        flash("Generated resume file is missing on disk.", "error")
        return redirect(url_for("main.dashboard"))

    return send_file(path, as_attachment=True, download_name=path.name)
