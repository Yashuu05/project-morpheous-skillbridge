"""
resume_routes.py
────────────────
Flask Blueprint: /api/resume

POST /api/resume/parse
  - Accepts PDF only (validated server-side)
  - Calls resume_parser.parse_resume_from_bytes()
  - Saves result to Firestore `resumes` collection keyed by uid
  - Returns JSON: { uid, fullName, skills, experience, projects, metadata }
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import sys
import os

# ── Resolve project root so we can import services/ ──────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.resume_parser import parse_resume_from_bytes
from utils.firebase_config import db

resume_bp = Blueprint("resume", __name__)

ALLOWED_MIME_TYPES = {"application/pdf"}
ALLOWED_EXTENSIONS = {".pdf"}


def _get_ext(filename: str) -> str:
    return os.path.splitext(filename.lower())[1]


# ─── POST /api/resume/parse ───────────────────────────────────────────────────
@resume_bp.route("/parse", methods=["POST"])
@jwt_required()
def parse_resume():
    """
    Accepts a multipart/form-data upload with key 'resume'.
    Validates that the file is a PDF, parses it, saves to Firestore,
    and returns the extracted data as JSON.
    """
    uid = get_jwt_identity()

    # ── 1. Validate file presence ─────────────────────────────────────────────
    if "resume" not in request.files:
        return jsonify({"error": "No file uploaded. Use key 'resume' in the form-data."}), 400

    file = request.files["resume"]

    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    # ── 2. Validate file type (extension + MIME) ──────────────────────────────
    ext = _get_ext(file.filename)
    mime = file.content_type or ""

    if ext not in ALLOWED_EXTENSIONS or mime not in ALLOWED_MIME_TYPES:
        rejected_label = file.filename.rsplit(".", 1)[-1].upper() if "." in file.filename else "Unknown"
        return jsonify({
            "error": f"Invalid file type: .{rejected_label.lower()} files are not accepted. "
                     "Please upload a PDF resume.",
            "allowed": ["PDF"],
            "received_extension": ext,
            "received_mime": mime,
        }), 415   # 415 Unsupported Media Type

    # ── 3. Parse the PDF ──────────────────────────────────────────────────────
    try:
        pdf_bytes = file.read()
        parsed = parse_resume_from_bytes(pdf_bytes, filename=file.filename)
    except Exception as exc:
        return jsonify({"error": f"PDF parsing failed: {str(exc)}"}), 500

    # ── 4. Fetch user profile for fullName ────────────────────────────────────
    full_name = ""
    try:
        user_doc = db.collection("users").document(uid).get()
        if user_doc.exists:
            full_name = user_doc.to_dict().get("fullName", "")
    except Exception:
        pass   # fullName is optional

    # ── 5. Save to Firestore `resumes` collection (keyed by uid) ─────────────
    resume_payload = {
        "uid":        uid,
        "fullName":   full_name,
        "skills":     parsed.get("skills",     []),
        "experience": parsed.get("experience", []),
        "projects":   parsed.get("projects",   []),
        "metadata":   parsed.get("metadata",   {}),
        "parsedAt":   db.SERVER_TIMESTAMP if hasattr(db, "SERVER_TIMESTAMP") else None,
    }

    try:
        from google.cloud import firestore as gfs
        resume_payload["parsedAt"] = gfs.SERVER_TIMESTAMP
        db.collection("resumes").document(uid).set(resume_payload, merge=True)
    except Exception as exc:
        # Don't fail the whole request just because Firestore write failed
        print(f"[resume_routes] Firestore write error: {exc}")

    # ── 6. Return extracted data (omit raw_text to keep response small) ───────
    return jsonify({
        "uid":        uid,
        "fullName":   full_name,
        "skills":     parsed.get("skills",     []),
        "experience": parsed.get("experience", []),
        "projects":   parsed.get("projects",   []),
        "metadata":   parsed.get("metadata",   {}),
    }), 200


# ─── GET /api/resume ──────────────────────────────────────────────────────────
@resume_bp.route("", methods=["GET"])
@jwt_required()
def get_resume():
    """
    Fetch the current user's saved resume data from Firestore.
    """
    uid = get_jwt_identity()
    try:
        doc = db.collection("resumes").document(uid).get()
        if not doc.exists:
            return jsonify({"message": "No resume uploaded yet."}), 404
        data = doc.to_dict()
        data.pop("parsedAt", None)   # remove server timestamp (not JSON-serialisable)
        return jsonify(data), 200
    except Exception as exc:
        return jsonify({"error": f"Could not fetch resume data: {str(exc)}"}), 500
