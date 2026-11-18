"""Routes for projects and their product photos."""
from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

bp = Blueprint("projects", __name__, url_prefix="/api/projects")


def svc():
    return current_app.extensions["services"]


@bp.get("")
def list_projects():
    return jsonify(svc().projects.list())


@bp.post("")
def create_project():
    pid = svc().projects.create(request.form, request.files.getlist("images"), bool(request.form.get("use_saved")))
    return jsonify({"id": pid})


@bp.get("/<pid>")
def project_state(pid: str):
    return jsonify(svc().projects.state(pid))


@bp.post("/<pid>/images")
def add_images(pid: str):
    return jsonify({"added": svc().projects.add_images(pid, request.files.getlist("files"))})
