from flask import Blueprint, g, redirect, render_template, url_for

from .db import query_db
from .decorators import login_required


bp = Blueprint("main", __name__)


@bp.route("/")
def index():
    if g.get("user"):
        return redirect(url_for("main.dashboard"))
    return render_template("landing.html")


@bp.route("/dashboard")
@login_required
def dashboard():
    user_id = g.user["id"]
    stats = {
        "total_uploads": query_db("SELECT COUNT(*) AS count FROM uploaded_resumes WHERE user_id = ?", (user_id,), one=True)["count"],
        "total_reports": query_db("SELECT COUNT(*) AS count FROM analysis_reports WHERE user_id = ?", (user_id,), one=True)["count"],
        "total_improvements": query_db("SELECT COUNT(*) AS count FROM ai_improvements WHERE user_id = ?", (user_id,), one=True)["count"],
        "average_score": query_db(
            "SELECT ROUND(COALESCE(AVG(score), 0), 0) AS average_score FROM analysis_reports WHERE user_id = ?",
            (user_id,),
            one=True,
        )["average_score"],
    }
    recent_reports = query_db(
        """
        SELECT ar.id, ar.score, ar.created_at, ar.job_match_score, ur.original_filename
        FROM analysis_reports ar
        JOIN uploaded_resumes ur ON ur.id = ar.resume_id
        WHERE ar.user_id = ?
        ORDER BY ar.created_at DESC
        LIMIT 5
        """,
        (user_id,),
    )
    recent_improvements = query_db(
        """
        SELECT id, title, action_type, created_at
        FROM ai_improvements
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 5
        """,
        (user_id,),
    )
    return render_template(
        "dashboard.html",
        stats=stats,
        recent_reports=recent_reports,
        recent_improvements=recent_improvements,
    )


@bp.route("/history")
@login_required
def history():
    reports = query_db(
        """
        SELECT ar.id, ar.score, ar.created_at, ar.job_match_score, ur.original_filename
        FROM analysis_reports ar
        JOIN uploaded_resumes ur ON ur.id = ar.resume_id
        WHERE ar.user_id = ?
        ORDER BY ar.created_at DESC
        """,
        (g.user["id"],),
    )
    return render_template("history.html", reports=reports)
