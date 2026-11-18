"""Flask application factory."""
from __future__ import annotations

from flask import Flask, jsonify, send_from_directory

from ..config import Settings, load_settings
from ..domain.project import MAX_VOICE_SECONDS, STORY_MAX_VOICE_SECONDS, VOICES
from ..errors import ReelStudioError
from ..media import remotion
from ..services import Services, build_services
from . import pipeline, projects


def create_app(settings: Settings | None = None, services: Services | None = None) -> Flask:
    settings = settings or load_settings()
    services = services or build_services(settings)

    app = Flask(__name__, static_folder=str(settings.web_dir), static_url_path="/static")
    app.config["MAX_CONTENT_LENGTH"] = settings.max_upload_mb * 1024 * 1024
    app.extensions["services"] = services

    app.register_blueprint(projects.bp)
    app.register_blueprint(pipeline.bp)

    @app.errorhandler(ReelStudioError)
    def handle_domain_error(exc: ReelStudioError):
        return jsonify({"error": str(exc)}), exc.status

    @app.errorhandler(413)
    def too_large(_exc):
        return jsonify({"error": f"That upload is bigger than {settings.max_upload_mb} MB."}), 413

    @app.get("/")
    def index():
        return send_from_directory(settings.web_dir, "index.html")

    @app.get("/files/<pid>/<path:name>")
    def project_file(pid: str, name: str):
        return send_from_directory(services.ctx.repo.project_dir(pid), name, conditional=True)

    @app.get("/api/config")
    def config():
        return jsonify({
            "provider": settings.provider,
            "missing": settings.missing(),
            "voices": VOICES,
            "maxVoiceSeconds": MAX_VOICE_SECONDS,
            "storyMaxVoiceSeconds": STORY_MAX_VOICE_SECONDS,
            "render": remotion.check(settings.remotion_dir),
        })

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True})

    return app
