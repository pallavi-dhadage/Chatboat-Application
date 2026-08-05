"""
Main REST API Blueprint — /api/v1/*

Registers routes for:
    Conversations:  POST /conversations, GET /conversations,
                    GET /conversations/{id}/messages
    Messages:       DELETE /messages/{id}, POST /messages/upload
    Users:          GET /users/me, PATCH /users/me, POST /users/me/avatar
    Notifications:  GET /notifications, POST /notifications/{id}/read
    Moderation:     GET /moderation/flagged, POST /moderation/messages/{id}/dismiss
    AI:             POST /ai/smart-replies, POST /ai/summarize,
                    POST /ai/assistant, POST /ai/search
    Analytics:      GET /analytics
"""

import os
import uuid
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from .models import (
    Conversation, ConversationParticipant, Message,
    Notification, User, db,
)
from .rate_limiter import rest_rate_limit
from .security import assert_conversation_participant, require_role, validate_text_input

routes_bp = Blueprint("routes", __name__)

# ---------------------------------------------------------------------------
# S3 helpers
# ---------------------------------------------------------------------------

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/gif",
                      "application/pdf", "text/plain"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


def _s3_client():
    return boto3.client(
        "s3",
        region_name=current_app.config.get("AWS_REGION", "us-east-1"),
        aws_access_key_id=current_app.config.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=current_app.config.get("AWS_SECRET_ACCESS_KEY"),
    )


def _upload_to_s3(file_bytes: bytes, key: str, content_type: str) -> str:
    """Upload bytes to S3 and return a presigned URL (TTL from config)."""
    bucket = current_app.config["AWS_S3_BUCKET"]
    ttl    = int(current_app.config.get("AWS_S3_PRESIGN_TTL", 3600))
    s3     = _s3_client()
    s3.put_object(Bucket=bucket, Key=key, Body=file_bytes, ContentType=content_type)
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=ttl,
    )
    return url


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------

@routes_bp.route("/conversations", methods=["POST"])
@jwt_required()
@rest_rate_limit
def create_conversation():
    """POST /api/v1/conversations — create a new conversation."""
    user_id = get_jwt_identity()
    data    = request.get_json(silent=True) or {}
    name    = (data.get("name") or "").strip()
    participants = data.get("participants", [])

    if not name:
        return jsonify({"error": "name is required"}), 400
    if len(name) > 200:
        return jsonify({"error": "name too long"}), 400

    # Determine conversation type
    all_participant_ids = list({user_id} | set(participants))
    conv_type = "direct" if len(all_participant_ids) == 2 else "group"

    conv = Conversation(
        id=str(uuid.uuid4()),
        name=name,
        type=conv_type,
    )
    db.session.add(conv)

    for pid in all_participant_ids:
        cp = ConversationParticipant(conversation_id=conv.id, user_id=pid)
        db.session.add(cp)

    db.session.commit()
    return jsonify(conv.to_dict()), 201


@routes_bp.route("/conversations", methods=["GET"])
@jwt_required()
@rest_rate_limit
def list_conversations():
    """GET /api/v1/conversations — list conversations the caller participates in."""
    user_id = get_jwt_identity()
    memberships = ConversationParticipant.query.filter_by(user_id=user_id).all()
    conv_ids    = [m.conversation_id for m in memberships]
    convs       = Conversation.query.filter(Conversation.id.in_(conv_ids)).all()
    return jsonify([c.to_dict() for c in convs]), 200


@routes_bp.route("/conversations/<conversation_id>/messages", methods=["GET"])
@jwt_required()
@rest_rate_limit
def get_messages(conversation_id):
    """GET /api/v1/conversations/{id}/messages — paginated message history."""
    user_id = get_jwt_identity()
    assert_conversation_participant(user_id, conversation_id)

    page      = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("page_size", 50)), 100)

    query = (
        Message.query
        .filter_by(conversation_id=conversation_id)
        .filter(Message.deleted_at.is_(None))
        .order_by(Message.created_at.desc())
    )
    total    = query.count()
    messages = query.offset((page - 1) * page_size).limit(page_size).all()

    return jsonify({
        "messages":  [m.to_dict() for m in messages],
        "page":      page,
        "page_size": page_size,
        "total":     total,
        "has_next":  (page * page_size) < total,
    }), 200


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

@routes_bp.route("/messages/<message_id>", methods=["DELETE"])
@jwt_required()
@rest_rate_limit
def delete_message(message_id):
    """DELETE /api/v1/messages/{id} — soft-delete a message."""
    user_id = get_jwt_identity()
    claims  = get_jwt()
    role    = claims.get("role", "user")

    msg = Message.query.get(message_id)
    if not msg or msg.deleted_at is not None:
        return jsonify({"error": "Message not found"}), 404

    # Only sender, moderator, or admin may delete
    if msg.sender_id != user_id and role not in ("moderator", "admin"):
        return jsonify({"error": "Forbidden"}), 403

    msg.deleted_at = datetime.now(timezone.utc)
    db.session.commit()

    # Broadcast deletion via SocketIO
    try:
        from . import socketio
        socketio.emit("message_deleted", {
            "message_id":      message_id,
            "conversation_id": msg.conversation_id,
        }, room=msg.conversation_id)
    except Exception:
        pass

    return jsonify({"message": "Deleted"}), 200


@routes_bp.route("/messages/upload", methods=["POST"])
@jwt_required()
@rest_rate_limit
def upload_file():
    """POST /api/v1/messages/upload — upload a file/image to S3."""
    user_id = get_jwt_identity()

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    f            = request.files["file"]
    content_type = f.content_type or ""
    file_bytes   = f.read()

    # Content-type allowlist check
    if content_type not in ALLOWED_MIME_TYPES:
        return jsonify({"error": f"File type '{content_type}' not allowed"}), 415

    # Size check
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        return jsonify({"error": "File exceeds 10 MB limit"}), 413

    # Image moderation (NSFW + face blur) for image types
    if content_type.startswith("image/"):
        try:
            import sys, os
            ai_path = os.path.join(os.path.dirname(__file__), "..", "..", "ai-services")
            if ai_path not in sys.path:
                sys.path.insert(0, ai_path)
            from image_moderator import analyze
            result = analyze(file_bytes)
            if result.get("nsfw"):
                return jsonify({"error": "Image rejected by content moderation"}), 422
            file_bytes = result.get("processed_image", file_bytes)
        except ImportError:
            pass  # ai-services not available — skip moderation in dev

    # Upload to S3
    key = f"{user_id}/{uuid.uuid4()}"
    try:
        presigned_url = _upload_to_s3(file_bytes, key, content_type)
    except ClientError as e:
        return jsonify({"error": "File upload failed", "detail": str(e)}), 500

    return jsonify({"url": presigned_url, "key": key}), 200


# ---------------------------------------------------------------------------
# Users / Profile
# ---------------------------------------------------------------------------

@routes_bp.route("/users/me", methods=["GET"])
@jwt_required()
@rest_rate_limit
def get_profile():
    """GET /api/v1/users/me — return caller's profile."""
    user_id = get_jwt_identity()
    user    = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200


@routes_bp.route("/users/me", methods=["PATCH"])
@jwt_required()
@rest_rate_limit
def update_profile():
    """PATCH /api/v1/users/me — partial update of name, status, bio."""
    user_id = get_jwt_identity()
    user    = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json(silent=True) or {}
    status_changed = False

    if "name" in data:
        user.name = (data["name"] or "").strip()[:100]
    if "bio" in data:
        user.bio = data["bio"]
    if "status" in data:
        user.status = (data["status"] or "")[:100]
        status_changed = True

    db.session.commit()

    # Broadcast presence update when status changes
    if status_changed:
        try:
            memberships = ConversationParticipant.query.filter_by(user_id=user_id).all()
            from . import socketio
            for m in memberships:
                socketio.emit("presence_update", {
                    "user_id": user_id,
                    "status":  user.status,
                    "online":  True,
                }, room=m.conversation_id)
        except Exception:
            pass

    return jsonify(user.to_dict()), 200


@routes_bp.route("/users/me/avatar", methods=["POST"])
@jwt_required()
@rest_rate_limit
def upload_avatar():
    """POST /api/v1/users/me/avatar — upload a new avatar image."""
    user_id = get_jwt_identity()
    user    = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    f            = request.files["file"]
    content_type = f.content_type or ""
    file_bytes   = f.read()

    if content_type not in {"image/jpeg", "image/png", "image/gif"}:
        return jsonify({"error": "Avatar must be JPEG, PNG, or GIF"}), 415

    if len(file_bytes) > MAX_UPLOAD_BYTES:
        return jsonify({"error": "File exceeds 10 MB limit"}), 413

    # Run image moderation
    try:
        import sys, os
        ai_path = os.path.join(os.path.dirname(__file__), "..", "..", "ai-services")
        if ai_path not in sys.path:
            sys.path.insert(0, ai_path)
        from image_moderator import analyze
        result = analyze(file_bytes)
        if result.get("nsfw"):
            return jsonify({"error": "Image rejected by content moderation"}), 422
        file_bytes = result.get("processed_image", file_bytes)
    except ImportError:
        pass

    key = f"avatars/{user_id}/{uuid.uuid4()}"
    try:
        presigned_url = _upload_to_s3(file_bytes, key, content_type)
    except ClientError as e:
        return jsonify({"error": "Upload failed", "detail": str(e)}), 500

    user.avatar_url = presigned_url
    db.session.commit()
    return jsonify({"avatar_url": presigned_url}), 200


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

@routes_bp.route("/notifications", methods=["GET"])
@jwt_required()
@rest_rate_limit
def get_notifications():
    """GET /api/v1/notifications — list unread notifications."""
    user_id       = get_jwt_identity()
    notifications = (
        Notification.query
        .filter_by(user_id=user_id)
        .filter(Notification.read_at.is_(None))
        .order_by(Notification.created_at.desc())
        .all()
    )
    return jsonify([n.to_dict() for n in notifications]), 200


@routes_bp.route("/notifications/<notification_id>/read", methods=["POST"])
@jwt_required()
@rest_rate_limit
def mark_notification_read(notification_id):
    """POST /api/v1/notifications/{id}/read — mark a notification as read."""
    user_id = get_jwt_identity()
    n = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
    if not n:
        return jsonify({"error": "Notification not found"}), 404
    n.read_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(n.to_dict()), 200


# ---------------------------------------------------------------------------
# Moderation (moderator / admin only)
# ---------------------------------------------------------------------------

@routes_bp.route("/moderation/flagged", methods=["GET"])
@jwt_required()
@require_role("moderator", "admin")
@rest_rate_limit
def get_flagged_messages():
    """GET /api/v1/moderation/flagged — paginated flagged messages."""
    page      = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("page_size", 20)), 100)

    query = (
        Message.query
        .filter_by(flagged=True)
        .filter(Message.deleted_at.is_(None))
        .order_by(Message.created_at.desc())
    )
    total    = query.count()
    messages = query.offset((page - 1) * page_size).limit(page_size).all()

    return jsonify({
        "messages":  [m.to_dict() for m in messages],
        "page":      page,
        "page_size": page_size,
        "total":     total,
    }), 200


@routes_bp.route("/moderation/messages/<message_id>/dismiss", methods=["POST"])
@jwt_required()
@require_role("moderator", "admin")
@rest_rate_limit
def dismiss_flagged_message(message_id):
    """POST /api/v1/moderation/messages/{id}/dismiss — clear flagged status."""
    msg = Message.query.get(message_id)
    if not msg:
        return jsonify({"error": "Message not found"}), 404

    msg.flagged = False
    db.session.commit()

    # Broadcast the now-approved message to conversation participants
    try:
        from . import socketio
        socketio.emit("new_message", msg.to_dict(), room=msg.conversation_id)
    except Exception:
        pass

    return jsonify({"message": "Flag dismissed", "data": msg.to_dict()}), 200


# ---------------------------------------------------------------------------
# AI endpoints
# ---------------------------------------------------------------------------

@routes_bp.route("/ai/smart-replies", methods=["POST"])
@jwt_required()
@rest_rate_limit
def smart_replies():
    """POST /api/v1/ai/smart-replies — generate 2-3 contextual reply suggestions."""
    data    = request.get_json(silent=True) or {}
    text    = (data.get("text") or "").strip()
    context = data.get("context", [])

    if not text:
        return jsonify({"error": "text is required"}), 400
    if len(text) > 4000:
        return jsonify({"error": "text too long"}), 400

    import time
    start = time.time()
    cache_hit = False

    try:
        import sys, os
        ai_path = os.path.join(os.path.dirname(__file__), "..", "..", "ai-services")
        if ai_path not in sys.path:
            sys.path.insert(0, ai_path)
        from smart_reply import generate_smart_replies, was_cache_hit
        replies   = generate_smart_replies(text, context)
        cache_hit = was_cache_hit(text)
    except Exception:
        replies   = ["Sure!", "I see.", "Thanks for letting me know."]
        cache_hit = False

    latency_ms = int((time.time() - start) * 1000)

    # Track usage stats in MySQL
    _record_ai_usage("/api/v1/ai/smart-replies", cache_hit, latency_ms)

    return jsonify({"replies": replies, "cache_hit": cache_hit}), 200


@routes_bp.route("/ai/summarize", methods=["POST"])
@jwt_required()
@rest_rate_limit
def summarize_conversation():
    """POST /api/v1/ai/summarize — summarize a conversation via LangGraph."""
    user_id         = get_jwt_identity()
    data            = request.get_json(silent=True) or {}
    conversation_id = data.get("conversation_id")

    if not conversation_id:
        return jsonify({"error": "conversation_id is required"}), 400

    assert_conversation_participant(user_id, conversation_id)

    messages = (
        Message.query
        .filter_by(conversation_id=conversation_id)
        .filter(Message.deleted_at.is_(None))
        .order_by(Message.created_at.asc())
        .all()
    )
    message_texts = [
        f"{m.sender_id}: {m.text}" for m in messages if m.text
    ]

    try:
        import sys, os, signal
        ai_path = os.path.join(os.path.dirname(__file__), "..", "..", "ai-services")
        if ai_path not in sys.path:
            sys.path.insert(0, ai_path)
        from summarizer import summarize

        summary = summarize(message_texts)
        return jsonify({"summary": summary, "word_count": len(summary.split())}), 200

    except TimeoutError:
        return jsonify({"error": "Summarization service unavailable, please try again"}), 503
    except Exception as e:
        return jsonify({"error": "Summarization service unavailable, please try again"}), 503


@routes_bp.route("/ai/assistant", methods=["POST"])
@jwt_required()
@rest_rate_limit
def ai_assistant():
    """POST /api/v1/ai/assistant — RAG-powered support assistant."""
    data  = request.get_json(silent=True) or {}
    query = (data.get("query") or "").strip()

    if not query:
        return jsonify({"error": "query is required"}), 400
    if len(query) > 4000:
        return jsonify({"error": "query too long"}), 400

    try:
        import sys, os
        ai_path = os.path.join(os.path.dirname(__file__), "..", "..", "ai-services")
        if ai_path not in sys.path:
            sys.path.insert(0, ai_path)
        from rag_pipeline import answer
        result = answer(query)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": "Assistant unavailable", "detail": str(e)}), 503


@routes_bp.route("/ai/search", methods=["POST"])
@jwt_required()
@rest_rate_limit
def semantic_search():
    """POST /api/v1/ai/search — semantic search over the caller's messages."""
    user_id = get_jwt_identity()
    data    = request.get_json(silent=True) or {}
    query   = (data.get("query") or "").strip()

    if not query:
        return jsonify({"error": "query is required"}), 400

    # Get conversation IDs the user participates in
    memberships = ConversationParticipant.query.filter_by(user_id=user_id).all()
    allowed_conv_ids = {m.conversation_id for m in memberships}

    try:
        import sys, os
        ai_path = os.path.join(os.path.dirname(__file__), "..", "..", "ai-services")
        if ai_path not in sys.path:
            sys.path.insert(0, ai_path)
        from embeddings_store import search
        results = search(query, top_k=10)

        # Filter to only conversations the caller participates in
        filtered = [r for r in results if r.get("conversation_id") in allowed_conv_ids]
        return jsonify({"results": filtered}), 200
    except Exception as e:
        return jsonify({"results": [], "error": str(e)}), 200


# ---------------------------------------------------------------------------
# Analytics (admin only)
# ---------------------------------------------------------------------------

@routes_bp.route("/analytics", methods=["GET"])
@jwt_required()
@require_role("admin")
@rest_rate_limit
def get_analytics():
    """GET /api/v1/analytics — aggregated platform metrics."""
    try:
        import sys, os
        ai_path = os.path.join(os.path.dirname(__file__), "..", "..", "ai-services")
        if ai_path not in sys.path:
            sys.path.insert(0, ai_path)
        from analytics_engine import compute_metrics
        metrics = compute_metrics()
    except Exception:
        metrics = {}

    # Include AI usage stats from MySQL
    ai_insights = _get_ai_insights()
    metrics["ai_insights"] = ai_insights

    return jsonify(metrics), 200


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _record_ai_usage(endpoint: str, cache_hit: bool, latency_ms: int):
    """Write an AI usage record to MySQL ai_usage_stats (best-effort)."""
    try:
        from datetime import date
        from .mysql_models import AIUsageStats
        today = date.today()
        stat  = AIUsageStats.query.filter_by(date=today, endpoint=endpoint).first()
        if not stat:
            stat = AIUsageStats(date=today, endpoint=endpoint)
            db.session.add(stat)
        stat.request_count += 1
        if cache_hit:
            stat.cache_hits += 1
        # Rolling average latency
        if stat.request_count > 1:
            stat.avg_latency_ms = (
                (stat.avg_latency_ms * (stat.request_count - 1) + latency_ms)
                / stat.request_count
            )
        else:
            stat.avg_latency_ms = float(latency_ms)
        db.session.commit()
    except Exception:
        pass  # Non-critical — never let analytics writes break the main flow


def _get_ai_insights() -> dict:
    """Read AI usage stats from MySQL for the analytics endpoint."""
    try:
        from datetime import date, timedelta
        from .mysql_models import AIUsageStats
        stats = AIUsageStats.query.filter(
            AIUsageStats.date >= date.today() - timedelta(days=7)
        ).all()
        total_requests = sum(s.request_count for s in stats)
        total_hits     = sum(s.cache_hits for s in stats)
        avg_latency    = (
            sum(s.avg_latency_ms * s.request_count for s in stats) / total_requests
            if total_requests else 0
        )
        return {
            "smart_reply_requests": total_requests,
            "cache_hits":           total_hits,
            "avg_latency_ms":       round(avg_latency, 1),
        }
    except Exception:
        return {"smart_reply_requests": 0, "cache_hits": 0, "avg_latency_ms": 0}
