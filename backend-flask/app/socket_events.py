"""
Socket.IO event handlers for the Chat_Service.

All real-time events are registered here via register_socket_handlers(socketio).

Events handled (client → server):
    connect          — JWT validation, presence online, join rooms
    disconnect       — presence offline, broadcast presence_update
    join_conversation  — join a SocketIO room
    leave_conversation — leave a SocketIO room
    send_message     — classify → persist → embed → broadcast
    typing           — broadcast typing_indicator (no DB)
    get_presence     — read Redis presence keys
    open_conversation  — mark notifications read, emit read_receipt

Events emitted (server → client):
    new_message, message_flagged, message_deleted, typing_indicator,
    read_receipt, presence_update, presence_status, rate_limit_exceeded
"""

import os
import sys
import uuid
from datetime import datetime, timezone

import redis as redis_lib
from flask import current_app
from flask_jwt_extended import decode_token
from flask_socketio import SocketIO, emit, join_room, leave_room


def _get_redis() -> redis_lib.Redis:
    url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    return redis_lib.from_url(url, decode_responses=True)


def _ai_path() -> str:
    return os.path.join(os.path.dirname(__file__), "..", "..", "ai-services")


def _ensure_ai_path():
    p = _ai_path()
    if p not in sys.path:
        sys.path.insert(0, p)


def register_socket_handlers(socketio: SocketIO):
    """Attach all Socket.IO event handlers to the given SocketIO instance."""

    # -------------------------------------------------------------------------
    # connect
    # -------------------------------------------------------------------------
    @socketio.on("connect")
    def on_connect(auth):
        """
        Validate JWT on connect. Reject with error 4001 if invalid.
        Set Redis presence key to 'online'. Join all conversation rooms.
        """
        from flask_socketio import disconnect as sio_disconnect
        from flask import request as flask_request

        token = None
        if auth and isinstance(auth, dict):
            token = auth.get("token")
        if not token:
            token = flask_request.args.get("token")

        if not token:
            sio_disconnect()
            return False

        try:
            decoded = decode_token(token)
        except Exception:
            sio_disconnect()
            return False

        user_id = decoded.get("sub")
        if not user_id:
            sio_disconnect()
            return False

        # Store user_id in session for this socket
        flask_request.environ["USER_ID"] = user_id

        # Set presence online
        rd = _get_redis()
        rd.set(f"presence:{user_id}", "online")

        # Join all conversation rooms for this user
        try:
            with current_app.app_context():
                from .models import ConversationParticipant
                memberships = ConversationParticipant.query.filter_by(
                    user_id=user_id
                ).all()
                for m in memberships:
                    join_room(m.conversation_id)
        except Exception:
            pass

        return True

    # -------------------------------------------------------------------------
    # disconnect
    # -------------------------------------------------------------------------
    @socketio.on("disconnect")
    def on_disconnect():
        from flask import request as flask_request
        user_id = flask_request.environ.get("USER_ID")
        if not user_id:
            return

        rd = _get_redis()
        rd.set(f"presence:{user_id}", "offline")

        # Broadcast presence_update to all conversation rooms
        try:
            with current_app.app_context():
                from .models import ConversationParticipant
                memberships = ConversationParticipant.query.filter_by(
                    user_id=user_id
                ).all()
                for m in memberships:
                    socketio.emit("presence_update", {
                        "user_id": user_id,
                        "online":  False,
                        "status":  "offline",
                    }, room=m.conversation_id)
        except Exception:
            pass

    # -------------------------------------------------------------------------
    # join_conversation / leave_conversation
    # -------------------------------------------------------------------------
    @socketio.on("join_conversation")
    def on_join_conversation(data):
        conversation_id = (data or {}).get("conversation_id")
        if conversation_id:
            join_room(conversation_id)

    @socketio.on("leave_conversation")
    def on_leave_conversation(data):
        conversation_id = (data or {}).get("conversation_id")
        if conversation_id:
            leave_room(conversation_id)

    # -------------------------------------------------------------------------
    # send_message
    # -------------------------------------------------------------------------
    @socketio.on("send_message")
    def on_send_message(data):
        """
        Process an incoming message:
          1. Rate-limit check
          2. Validate text
          3. Classify (Scikit-Learn)
          4. Persist to PostgreSQL
          5. Store embedding (FAISS)
          6. Broadcast new_message or message_flagged
          7. Run Sentiment_Model async
          8. Create Notification for offline participants
        """
        from flask import request as flask_request
        user_id = flask_request.environ.get("USER_ID")
        if not user_id:
            return

        conversation_id = (data or {}).get("conversation_id")
        text            = (data or {}).get("text", "").strip()
        file_url        = (data or {}).get("file_url")

        if not conversation_id or not text:
            return

        # Text length validation
        if len(text) > 4000:
            emit("error", {"message": "Message text exceeds 4000 characters"})
            return

        # Rate limit check
        try:
            with current_app.app_context():
                from .rate_limiter import check_ws_limit
                allowed, retry_after = check_ws_limit(user_id)
                if not allowed:
                    emit("rate_limit_exceeded", {"retry_after_seconds": retry_after})
                    return
        except Exception:
            pass

        # Classify message
        label      = "clean"
        confidence = 1.0
        try:
            _ensure_ai_path()
            from classifier import classify
            label, confidence = classify(text)
        except ImportError:
            pass
        except Exception:
            pass

        # Borderline — route to LangGraph Moderation_Agent for deep check
        if 0.4 <= confidence <= 0.6:
            try:
                from summarizer import moderate_message
                label = moderate_message(text)
            except Exception:
                pass

        flagged = label in ("spam", "toxic")

        with current_app.app_context():
            from .models import Message, Notification, ConversationParticipant, db

            msg = Message(
                id=str(uuid.uuid4()),
                conversation_id=conversation_id,
                sender_id=user_id,
                text=text,
                file_url=file_url,
                classification_label=label,
                classification_conf=confidence,
                flagged=flagged,
            )
            db.session.add(msg)
            db.session.commit()

            msg_dict = msg.to_dict()

        if flagged:
            # Notify moderators/admins only
            socketio.emit("message_flagged", {
                "message_id":          msg_dict["id"],
                "sender_id":           user_id,
                "classification_label": label,
            }, room=f"moderators")
        else:
            # Store embedding for semantic search
            try:
                _ensure_ai_path()
                from embeddings_store import add as add_embedding
                add_embedding(msg_dict["id"], text)
            except Exception:
                pass

            # Broadcast to conversation room
            socketio.emit("new_message", msg_dict, room=conversation_id)

            # Run sentiment analysis and update message
            try:
                _ensure_ai_path()
                from sentiment import predict as predict_sentiment
                sent_label, sent_score = predict_sentiment(text)
                with current_app.app_context():
                    from .models import Message, db
                    m = Message.query.get(msg_dict["id"])
                    if m:
                        m.sentiment_label = sent_label
                        m.sentiment_score = sent_score
                        db.session.commit()
            except Exception:
                pass

            # Create notifications for offline participants
            _notify_offline_participants(
                conversation_id, user_id, msg_dict["id"], text
            )

    # -------------------------------------------------------------------------
    # typing
    # -------------------------------------------------------------------------
    @socketio.on("typing")
    def on_typing(data):
        """Broadcast typing indicator — no DB call, must be fast (<200ms)."""
        from flask import request as flask_request
        user_id         = flask_request.environ.get("USER_ID")
        conversation_id = (data or {}).get("conversation_id")
        if user_id and conversation_id:
            emit("typing_indicator", {
                "conversation_id": conversation_id,
                "user_id":         user_id,
            }, room=conversation_id, include_self=False)

    # -------------------------------------------------------------------------
    # get_presence
    # -------------------------------------------------------------------------
    @socketio.on("get_presence")
    def on_get_presence(data):
        """Return online/offline status for a list of user IDs from Redis."""
        user_ids = (data or {}).get("user_ids", [])
        if not user_ids:
            return
        rd       = _get_redis()
        statuses = {}
        for uid in user_ids:
            val = rd.get(f"presence:{uid}")
            statuses[uid] = val if val in ("online", "offline") else "offline"
        emit("presence_status", {"statuses": statuses})

    # -------------------------------------------------------------------------
    # open_conversation (read receipts)
    # -------------------------------------------------------------------------
    @socketio.on("open_conversation")
    def on_open_conversation(data):
        """
        When a user opens a conversation:
          - Mark their unread notifications for that conversation as read
          - Broadcast read_receipt to room participants
        """
        from flask import request as flask_request
        user_id         = flask_request.environ.get("USER_ID")
        conversation_id = (data or {}).get("conversation_id")
        if not user_id or not conversation_id:
            return

        now = datetime.now(timezone.utc)
        with current_app.app_context():
            from .models import Notification, db
            unread = (
                Notification.query
                .filter_by(user_id=user_id)
                .filter(Notification.read_at.is_(None))
                .filter(
                    Notification.payload.op("->>")(
                        "conversation_id"
                    ) == conversation_id
                )
                .all()
            )
            for n in unread:
                n.read_at = now
            db.session.commit()

        socketio.emit("read_receipt", {
            "conversation_id": conversation_id,
            "user_id":         user_id,
            "timestamp":       now.isoformat(),
        }, room=conversation_id)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _notify_offline_participants(
    conversation_id: str, sender_id: str, message_id: str, text: str
):
    """Create Notification rows for participants who are currently offline."""
    try:
        rd = _get_redis()
        with current_app.app_context():
            from .models import ConversationParticipant, Notification, User, db
            members = ConversationParticipant.query.filter_by(
                conversation_id=conversation_id
            ).all()
            sender = User.query.get(sender_id)
            sender_name = sender.name if sender else "Someone"
            preview = text[:60]

            for m in members:
                if m.user_id == sender_id:
                    continue
                presence = rd.get(f"presence:{m.user_id}")
                if presence != "online":
                    n = Notification(
                        id=str(uuid.uuid4()),
                        user_id=m.user_id,
                        type="new_message",
                        payload={
                            "conversation_id": conversation_id,
                            "message_id":      message_id,
                            "sender_name":     sender_name,
                            "preview":         preview,
                        },
                    )
                    db.session.add(n)
            db.session.commit()
    except Exception:
        pass
