from pathlib import Path

from flask import Flask, flash, redirect, url_for

from config import Config

from . import db
from .ai_routes import bp as ai_bp
from .auth import bp as auth_bp
from .main import bp as main_bp
from .resumes import bp as resumes_bp


def create_app(config_class=Config):
    root_dir = Path(__file__).resolve().parent.parent
    app = Flask(
        __name__,
        instance_relative_config=True,
        template_folder=str(root_dir / "templates"),
        static_folder=str(root_dir / "static"),
    )
    app.config.from_object(config_class)

    for folder_key in ("UPLOAD_FOLDER", "GENERATED_FOLDER"):
        app.config[folder_key].mkdir(parents=True, exist_ok=True)

    app.config["DATABASE"].parent.mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(resumes_bp)
    app.register_blueprint(ai_bp)

    @app.context_processor
    def inject_globals():
        return {
            "ai_action_labels": {
                "improve_summary": "Improve Summary",
                "rewrite_bullets": "Rewrite Bullet Points",
                "improve_projects": "Improve Project Descriptions",
                "optimize_ats": "Optimize for ATS",
                "tailor_job_description": "Tailor to Job Description",
                "full_resume_enhancement": "Generate Improved Resume",
            }
        }

    @app.errorhandler(413)
    def file_too_large(_error):
        flash("The uploaded file is too large. Please use a PDF under 10 MB.", "error")
        return redirect(url_for("resumes.upload_resume"))

    with app.app_context():
        db.init_db()

    return app
