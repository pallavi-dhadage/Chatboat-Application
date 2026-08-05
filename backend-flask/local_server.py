"""
ChatFlow AI - Local Development Backend Server
Runs with SQLite (no Docker/PostgreSQL needed)
Port: 5001
"""

import hashlib
import json
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps

import bcrypt
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    get_jwt, get_jwt_identity, jwt_required,
)
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_sqlalchemy import SQLAlchemy

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

# ---------------------------------------------------------------------------
# App + Config
# ---------------------------------------------------------------------------
app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.getenv("FLASK_SECRET_KEY", "dev-secret-chatflow-2024"),
    JWT_SECRET_KEY=os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-chatflow-2024"),
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(days=1),
    JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=7),
    JWT_TOKEN_LOCATION=["headers"],
    JWT_HEADER_TYPE="Bearer",
    SQLALCHEMY_DATABASE_URI="sqlite:///" + os.path.join(os.path.dirname(__file__), "chatapp.db"),
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    MAX_CONTENT_LENGTH=15 * 1024 * 1024,
)

CORS(app, origins="*", supports_credentials=True)
db = SQLAlchemy(app)
jwt = JWTManager(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading", logger=False, engineio_logger=False)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "llama-3.1-8b-instant"

# In-memory state (no Redis needed locally)
_presence = {}         # {user_id: "online"|"offline"}
_reply_cache = {}      # {hash: (replies, timestamp)}
_CACHE_TTL = 60


# ---------------------------------------------------------------------------
# Database Models
# ---------------------------------------------------------------------------
class User(db.Model):
    __tablename__ = "users"
    id            = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email         = db.Column(db.String(255), unique=True, nullable=False)
    name          = db.Column(db.String(100), nullable=False)
    role          = db.Column(db.String(20), nullable=False, default="user")
    password_hash = db.Column(db.String(128), nullable=False)
    avatar_url    = db.Column(db.Text, nullable=True)
    status        = db.Column(db.String(100), nullable=True)
    bio           = db.Column(db.Text, nullable=True)
    created_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at    = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {"id": self.id, "email": self.email, "name": self.name,
                "role": self.role, "avatar_url": self.avatar_url,
                "status": self.status, "bio": self.bio}

class Conversation(db.Model):
    __tablename__ = "conversations"
    id         = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name       = db.Column(db.String(200), nullable=False)
    type       = db.Column(db.String(20), nullable=False, default="group")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {"id": self.id, "name": self.name, "type": self.type,
                "created_at": self.created_at.isoformat() if self.created_at else None}

class ConversationParticipant(db.Model):
    __tablename__ = "conversation_participants"
    conversation_id = db.Column(db.String(36), db.ForeignKey("conversations.id"), primary_key=True)
    user_id         = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)

class Message(db.Model):
    __tablename__ = "messages"
    id              = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = db.Column(db.String(36), db.ForeignKey("conversations.id"), nullable=False)
    sender_id       = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    text            = db.Column(db.Text, nullable=True)
    file_url        = db.Column(db.Text, nullable=True)
    sentiment_label = db.Column(db.String(20), nullable=True)
    sentiment_score = db.Column(db.Float, nullable=True)
    flagged         = db.Column(db.Boolean, default=False)
    deleted_at      = db.Column(db.DateTime, nullable=True)
    created_at      = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        sender = User.query.get(self.sender_id)
        return {
            "id": self.id, "conversation_id": self.conversation_id,
            "sender_id": self.sender_id,
            "sender_name": sender.name if sender else "Unknown",
            "sender_avatar": sender.avatar_url if sender else None,
            "text": self.text, "file_url": self.file_url,
            "sentiment_label": self.sentiment_label,
            "sentiment_score": self.sentiment_score,
            "flagged": self.flagged,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class Notification(db.Model):
    __tablename__ = "notifications"
    id         = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    type       = db.Column(db.String(50), nullable=False)
    payload    = db.Column(db.JSON, nullable=False, default=dict)
    read_at    = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {"id": self.id, "user_id": self.user_id, "type": self.type,
                "payload": self.payload, "read_at": self.read_at.isoformat() if self.read_at else None,
                "created_at": self.created_at.isoformat() if self.created_at else None}


# ---------------------------------------------------------------------------
# Groq AI Helper
# ---------------------------------------------------------------------------
def call_groq(system_prompt: str, user_message: str, max_tokens: int = 512) -> str:
    """Call Groq API. Returns text or raises exception."""
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not set")
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        max_tokens=max_tokens,
        temperature=0.7,
        timeout=10,
    )
    return response.choices[0].message.content.strip()

def call_groq_json(system_prompt: str, user_message: str, max_tokens: int = 256) -> dict:
    """Call Groq and parse JSON response. Returns dict."""
    raw = call_groq(system_prompt + "\n\nIMPORTANT: Respond with ONLY valid JSON, no markdown.", user_message, max_tokens)
    # Strip markdown code blocks if present
    raw = raw.strip()
    if raw.startswith("```"):
        raw = "\n".join(raw.split("\n")[1:-1])
    return json.loads(raw)

def groq_smart_replies(text: str) -> list:
    cache_key = hashlib.sha256(text.encode()).hexdigest()[:16]
    if cache_key in _reply_cache:
        replies, ts = _reply_cache[cache_key]
        if time.time() - ts < _CACHE_TTL:
            return replies
    if not GROQ_API_KEY:
        return ["Sure!", "Got it.", "Thanks!"]
    try:
        result = call_groq_json(
            'You are a smart reply assistant. Generate exactly 3 short, natural, contextually appropriate replies for the given message. Each reply should be 2-8 words. Return a JSON array of 3 strings. Example: ["Sounds great!", "I will check it", "Thanks for sharing"]',
            f"Message to reply to: {text[:500]}"
        )
        if isinstance(result, list) and len(result) >= 3:
            replies = [str(r) for r in result[:3]]
        else:
            replies = ["Sure!", "Got it.", "Thanks!"]
    except Exception:
        replies = ["Sounds good!", "I will look into it", "Thanks!"]
    _reply_cache[cache_key] = (replies, time.time())
    return replies

def groq_sentiment(text: str) -> dict:
    if not GROQ_API_KEY:
        return {"label": "neutral", "score": 0.6, "explanation": "AI not configured"}
    try:
        result = call_groq_json(
            'Analyze the sentiment of the message. Return JSON with keys: "label" (one of: positive, neutral, negative), "score" (float 0.0-1.0 confidence), "explanation" (one sentence).',
            f"Message: {text[:500]}"
        )
        label = result.get("label", "neutral")
        if label not in ("positive", "neutral", "negative"):
            label = "neutral"
        return {"label": label, "score": float(result.get("score", 0.6)), "explanation": result.get("explanation", "")}
    except Exception:
        return {"label": "neutral", "score": 0.5, "explanation": "Could not analyze sentiment"}

def groq_classify(text: str) -> dict:
    if not GROQ_API_KEY:
        return {"label": "clean", "confidence": 0.9}
    try:
        result = call_groq_json(
            'You are a content moderation system. Classify the message as "clean", "spam", or "toxic". Return JSON: {"label": "clean"|"spam"|"toxic", "confidence": 0.0-1.0}.',
            f"Message: {text[:300]}"
        )
        label = result.get("label", "clean")
        if label not in ("clean", "spam", "toxic"):
            label = "clean"
        return {"label": label, "confidence": float(result.get("confidence", 0.9))}
    except Exception:
        return {"label": "clean", "confidence": 0.8}

def groq_summarize(messages: list) -> str:
    if not GROQ_API_KEY:
        return f"This conversation contains {len(messages)} messages covering various topics."
    conv_text = "\n".join(messages[-50:])[:3000]
    try:
        return call_groq(
            "You are a conversation summarizer. Provide a concise, structured summary of the conversation. Highlight key topics, decisions made, and any action items. Keep it under 200 words.",
            f"Conversation to summarize:\n{conv_text}",
            max_tokens=300
        )
    except Exception as e:
        return f"Could not generate summary: {str(e)}"

def groq_assistant(query: str) -> dict:
    if not GROQ_API_KEY:
        return {"answer": "Please set GROQ_API_KEY in your .env file to enable the AI assistant.", "confidence": 0.0}
    try:
        answer = call_groq(
            "You are a helpful AI assistant embedded in a professional real-time chat platform called ChatFlow AI. Answer questions helpfully, concisely and professionally. If asked about the platform, explain its features: real-time messaging, AI smart replies, conversation summarization, sentiment analysis, and group/direct chats.",
            query,
            max_tokens=400
        )
        return {"answer": answer, "confidence": 0.9}
    except Exception as e:
        return {"answer": f"I encountered an error: {str(e)}", "confidence": 0.0}

def groq_chat_reply(user_message: str, history: list, system_context: str = "") -> dict:
    """Generate a contextual AI chat reply using conversation history."""
    if not GROQ_API_KEY:
        return {"reply": "AI assistant is not configured. Add GROQ_API_KEY to .env", "model": "none", "tokens_used": 0}
    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        messages = [{"role": "system", "content": "You are a helpful, friendly AI assistant in a professional chat platform. Be concise (2-4 sentences max), helpful, and conversational. " + system_context}]
        for h in history[-10:]:
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        messages.append({"role": "user", "content": user_message})
        resp = client.chat.completions.create(model=GROQ_MODEL, messages=messages, max_tokens=256, temperature=0.8, timeout=10)
        return {"reply": resp.choices[0].message.content.strip(), "model": GROQ_MODEL, "tokens_used": resp.usage.total_tokens if resp.usage else 0}
    except Exception as e:
        return {"reply": f"Sorry, I could not process that request. Error: {str(e)}", "model": "error", "tokens_used": 0}


# ---------------------------------------------------------------------------
# JWT Error Handlers
# ---------------------------------------------------------------------------
@jwt.expired_token_loader
def expired_token(_h, _p): return jsonify({"error": "Token expired"}), 401

@jwt.invalid_token_loader
def invalid_token(_e): return jsonify({"error": "Invalid token"}), 401

@jwt.unauthorized_loader
def missing_token(_e): return jsonify({"error": "Authorization required"}), 401

# ---------------------------------------------------------------------------
# RBAC Helper
# ---------------------------------------------------------------------------
def require_role(*roles):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            claims = get_jwt()
            if claims.get("role") not in roles:
                return jsonify({"error": f"Required role: {' or '.join(roles)}"}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator

# ---------------------------------------------------------------------------
# Security Headers
# ---------------------------------------------------------------------------
@app.after_request
def add_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    return response

# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------
@app.route("/api/v1/health")
def health():
    return jsonify({"status": "ok", "version": "1.0.0", "ai_enabled": bool(GROQ_API_KEY), "model": GROQ_MODEL}), 200

# ---------------------------------------------------------------------------
# Auth Routes
# ---------------------------------------------------------------------------
@app.route("/api/v1/auth/register", methods=["POST", "OPTIONS"])
def register():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    data = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip().lower()
    name     = (data.get("name") or "").strip()
    password = (data.get("password") or "")
    if not email or not name or not password:
        return jsonify({"error": "email, name and password required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already in use"}), 409
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(10)).decode("utf-8")
    user = User(id=str(uuid.uuid4()), email=email, name=name, password_hash=hashed)
    db.session.add(user)
    db.session.commit()
    return jsonify({"id": user.id, "email": user.email, "name": user.name}), 201

@app.route("/api/v1/auth/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    data = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "")
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400
    user = User.query.filter_by(email=email).first()
    if not user or user.deleted_at:
        return jsonify({"error": "Invalid credentials"}), 401
    if not bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode("utf-8")):
        return jsonify({"error": "Invalid credentials"}), 401
    extra = {"role": user.role, "name": user.name}
    access  = create_access_token(identity=user.id, additional_claims=extra)
    refresh = create_refresh_token(identity=user.id, additional_claims=extra)
    return jsonify({"access_token": access, "refresh_token": refresh, "user": user.to_dict()}), 200

@app.route("/api/v1/auth/refresh", methods=["POST", "OPTIONS"])
@jwt_required(refresh=True)
def refresh_token():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    uid  = get_jwt_identity()
    user = User.query.get(uid)
    if not user:
        return jsonify({"error": "User not found"}), 401
    extra       = {"role": user.role, "name": user.name}
    new_access  = create_access_token(identity=uid, additional_claims=extra)
    return jsonify({"access_token": new_access}), 200

@app.route("/api/v1/auth/logout", methods=["POST", "OPTIONS"])
def logout():
    return jsonify({"message": "Logged out"}), 200


# ---------------------------------------------------------------------------
# User Routes
# ---------------------------------------------------------------------------
@app.route("/api/v1/users/me", methods=["GET", "OPTIONS"])
@jwt_required()
def get_me():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200

@app.route("/api/v1/users/me", methods=["PATCH"])
@jwt_required()
def update_me():
    data = request.get_json(silent=True) or {}
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"error": "User not found"}), 404
    if "name"   in data: user.name   = (data["name"] or "")[:100]
    if "status" in data: user.status = (data["status"] or "")[:100]
    if "bio"    in data: user.bio    = data["bio"]
    db.session.commit()
    return jsonify(user.to_dict()), 200

# ---------------------------------------------------------------------------
# Conversation Routes
# ---------------------------------------------------------------------------
@app.route("/api/v1/conversations", methods=["POST", "OPTIONS"])
@jwt_required()
def create_conversation():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    uid  = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    participants = list({uid} | set(data.get("participants", [])))
    conv = Conversation(id=str(uuid.uuid4()), name=name, type="direct" if len(participants) == 2 else "group")
    db.session.add(conv)
    for pid in participants:
        db.session.add(ConversationParticipant(conversation_id=conv.id, user_id=pid))
    db.session.commit()
    return jsonify(conv.to_dict()), 201

@app.route("/api/v1/conversations", methods=["GET"])
@jwt_required()
def list_conversations():
    uid = get_jwt_identity()
    rows = db.session.query(Conversation).join(ConversationParticipant, Conversation.id == ConversationParticipant.conversation_id).filter(ConversationParticipant.user_id == uid).all()
    result = []
    for c in rows:
        d = c.to_dict()
        last = Message.query.filter_by(conversation_id=c.id).filter(Message.deleted_at.is_(None)).order_by(Message.created_at.desc()).first()
        d["last_message"]      = last.text if last else None
        d["last_message_time"] = last.created_at.isoformat() if last else None
        d["unread_count"]      = Notification.query.filter_by(user_id=uid, type="new_message").filter(Notification.payload.op("->>")("conversation_id") == c.id if hasattr(Notification.payload, "op") else True).filter(Notification.read_at.is_(None)).count()
        result.append(d)
    return jsonify(result), 200

@app.route("/api/v1/conversations/<cid>/messages", methods=["GET"])
@jwt_required()
def get_messages(cid):
    uid = get_jwt_identity()
    if not ConversationParticipant.query.filter_by(conversation_id=cid, user_id=uid).first():
        return jsonify({"error": "Not a participant"}), 403
    page      = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("page_size", 50)), 100)
    q     = Message.query.filter_by(conversation_id=cid).filter(Message.deleted_at.is_(None)).order_by(Message.created_at.desc())
    total = q.count()
    msgs  = q.offset((page - 1) * page_size).limit(page_size).all()
    return jsonify({"messages": [m.to_dict() for m in msgs], "page": page, "page_size": page_size, "total": total, "has_next": (page * page_size) < total}), 200

@app.route("/api/v1/messages/send", methods=["POST", "OPTIONS"])
@jwt_required()
def send_message():
    """Send a message — persist, run AI classification + sentiment, broadcast."""
    if request.method == "OPTIONS":
        return jsonify({}), 200
    uid  = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    cid  = data.get("conversation_id")
    text = (data.get("text") or "").strip()
    if not cid or not text:
        return jsonify({"error": "conversation_id and text required"}), 400
    if len(text) > 4000:
        return jsonify({"error": "Message too long"}), 400
    if not ConversationParticipant.query.filter_by(conversation_id=cid, user_id=uid).first():
        return jsonify({"error": "Not a participant"}), 403

    # Run classification + sentiment (non-blocking, best effort)
    classification = groq_classify(text)
    sentiment      = groq_sentiment(text) if classification["label"] == "clean" else {"label": "neutral", "score": 0.5, "explanation": ""}
    flagged        = classification["label"] in ("spam", "toxic")

    msg = Message(
        id=str(uuid.uuid4()), conversation_id=cid, sender_id=uid,
        text=text, flagged=flagged,
        sentiment_label=sentiment["label"], sentiment_score=sentiment["score"],
    )
    db.session.add(msg)
    db.session.commit()

    msg_dict = msg.to_dict()

    # Broadcast via SocketIO
    if not flagged:
        socketio.emit("new_message", msg_dict, room=cid)
    else:
        socketio.emit("message_flagged", {"message_id": msg.id, "sender_id": uid, "label": classification["label"]}, room="moderators")

    # Create notifications for other participants
    others = ConversationParticipant.query.filter_by(conversation_id=cid).filter(ConversationParticipant.user_id != uid).all()
    sender = User.query.get(uid)
    for p in others:
        n = Notification(user_id=p.user_id, type="new_message", payload={"conversation_id": cid, "message_id": msg.id, "sender_name": sender.name if sender else "Someone", "preview": text[:60]})
        db.session.add(n)
    db.session.commit()

    return jsonify({**msg_dict, "classification": classification, "sentiment": sentiment}), 201

@app.route("/api/v1/messages/<mid>", methods=["DELETE"])
@jwt_required()
def delete_message(mid):
    uid    = get_jwt_identity()
    claims = get_jwt()
    msg    = Message.query.get(mid)
    if not msg or msg.deleted_at:
        return jsonify({"error": "Message not found"}), 404
    if msg.sender_id != uid and claims.get("role") not in ("moderator", "admin"):
        return jsonify({"error": "Forbidden"}), 403
    msg.deleted_at = datetime.now(timezone.utc)
    db.session.commit()
    socketio.emit("message_deleted", {"message_id": mid, "conversation_id": msg.conversation_id}, room=msg.conversation_id)
    return jsonify({"message": "Deleted"}), 200


# ---------------------------------------------------------------------------
# AI Routes (Real Groq Integration)
# ---------------------------------------------------------------------------
@app.route("/api/v1/ai/smart-replies", methods=["POST", "OPTIONS"])
@jwt_required()
def smart_replies():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    data    = request.get_json(silent=True) or {}
    text    = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text required"}), 400
    replies = groq_smart_replies(text)
    return jsonify({"replies": replies, "ai_powered": bool(GROQ_API_KEY)}), 200

@app.route("/api/v1/ai/chat", methods=["POST", "OPTIONS"])
@jwt_required()
def ai_chat():
    """Generate a real Groq AI response with conversation history context."""
    if request.method == "OPTIONS":
        return jsonify({}), 200
    data    = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    history = data.get("history", [])
    context = data.get("context", "")
    if not message:
        return jsonify({"error": "message required"}), 400
    result  = groq_chat_reply(message, history, context)
    return jsonify(result), 200

@app.route("/api/v1/ai/sentiment", methods=["POST", "OPTIONS"])
@jwt_required()
def analyze_sentiment():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text required"}), 400
    result = groq_sentiment(text)
    return jsonify(result), 200

@app.route("/api/v1/ai/summarize", methods=["POST", "OPTIONS"])
@jwt_required()
def summarize():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    uid  = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    cid  = data.get("conversation_id")
    if not cid:
        return jsonify({"error": "conversation_id required"}), 400
    if not ConversationParticipant.query.filter_by(conversation_id=cid, user_id=uid).first():
        return jsonify({"error": "Not a participant"}), 403
    msgs  = Message.query.filter_by(conversation_id=cid).filter(Message.deleted_at.is_(None)).order_by(Message.created_at.asc()).limit(50).all()
    texts = []
    for m in msgs:
        sender = User.query.get(m.sender_id)
        name   = sender.name if sender else "Unknown"
        texts.append(f"{name}: {m.text}")
    summary = groq_summarize(texts)
    return jsonify({"summary": summary, "message_count": len(msgs), "word_count": len(summary.split()), "ai_powered": bool(GROQ_API_KEY)}), 200

@app.route("/api/v1/ai/assistant", methods=["POST", "OPTIONS"])
@jwt_required()
def assistant():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    data  = request.get_json(silent=True) or {}
    query = (data.get("query") or "").strip()
    if not query:
        return jsonify({"error": "query required"}), 400
    result = groq_assistant(query)
    return jsonify(result), 200

@app.route("/api/v1/ai/classify", methods=["POST", "OPTIONS"])
@jwt_required()
def classify_message():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text required"}), 400
    return jsonify(groq_classify(text)), 200

# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
@app.route("/api/v1/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    uid   = get_jwt_identity()
    notifs = Notification.query.filter_by(user_id=uid).filter(Notification.read_at.is_(None)).order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify([n.to_dict() for n in notifs]), 200

@app.route("/api/v1/notifications/<nid>/read", methods=["POST"])
@jwt_required()
def mark_read(nid):
    uid = get_jwt_identity()
    n   = Notification.query.filter_by(id=nid, user_id=uid).first()
    if not n:
        return jsonify({"error": "Not found"}), 404
    n.read_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(n.to_dict()), 200

# ---------------------------------------------------------------------------
# Analytics (admin)
# ---------------------------------------------------------------------------
@app.route("/api/v1/analytics", methods=["GET"])
@jwt_required()
@require_role("admin")
def analytics():
    total_msgs    = Message.query.filter(Message.deleted_at.is_(None)).count()
    total_users   = User.query.filter(User.deleted_at.is_(None)).count()
    flagged_count = Message.query.filter_by(flagged=True).count()
    pos  = Message.query.filter_by(sentiment_label="positive").count()
    neg  = Message.query.filter_by(sentiment_label="negative").count()
    neu  = Message.query.filter_by(sentiment_label="neutral").count()
    total_sent = pos + neg + neu or 1
    return jsonify({
        "message_volume": total_msgs,
        "active_users": total_users,
        "flagged_message_count": flagged_count,
        "sentiment_trend": [{"date": datetime.now().strftime("%Y-%m-%d"), "positive": round(pos/total_sent,3), "neutral": round(neu/total_sent,3), "negative": round(neg/total_sent,3)}],
        "response_time_ms": 1200,
        "ai_insights": {"smart_reply_requests": len(_reply_cache), "cache_hits": 0, "avg_latency_ms": 380},
    }), 200

# ---------------------------------------------------------------------------
# Moderation
# ---------------------------------------------------------------------------
@app.route("/api/v1/moderation/flagged", methods=["GET"])
@jwt_required()
@require_role("moderator", "admin")
def flagged_messages():
    page  = int(request.args.get("page", 1))
    psize = min(int(request.args.get("page_size", 20)), 100)
    q     = Message.query.filter_by(flagged=True).filter(Message.deleted_at.is_(None)).order_by(Message.created_at.desc())
    total = q.count()
    msgs  = q.offset((page-1)*psize).limit(psize).all()
    return jsonify({"messages": [m.to_dict() for m in msgs], "total": total, "page": page}), 200

@app.route("/api/v1/moderation/messages/<mid>/dismiss", methods=["POST"])
@jwt_required()
@require_role("moderator", "admin")
def dismiss_flag(mid):
    msg = Message.query.get(mid)
    if not msg:
        return jsonify({"error": "Not found"}), 404
    msg.flagged = False
    db.session.commit()
    socketio.emit("new_message", msg.to_dict(), room=msg.conversation_id)
    return jsonify({"message": "Dismissed", "data": msg.to_dict()}), 200


# ---------------------------------------------------------------------------
# Socket.IO Events
# ---------------------------------------------------------------------------
@socketio.on("connect")
def on_connect(auth):
    from flask_jwt_extended import decode_token
    token = None
    if isinstance(auth, dict):
        token = auth.get("token")
    if not token:
        token = request.args.get("token")
    if not token:
        return False  # reject
    try:
        data    = decode_token(token)
        user_id = data.get("sub")
        if not user_id:
            return False
        # Store in socket session
        from flask import g
        _presence[user_id] = "online"
        # Join all conversation rooms
        rows = ConversationParticipant.query.filter_by(user_id=user_id).all()
        for r in rows:
            join_room(r.conversation_id)
        join_room(f"user_{user_id}")
        # Broadcast online status
        claims = data.get("role", "user")
        if claims == "moderator" or claims == "admin":
            join_room("moderators")
        socketio.emit("presence_update", {"user_id": user_id, "online": True, "status": "online"}, skip_sid=request.sid)
    except Exception:
        return False

@socketio.on("disconnect")
def on_disconnect():
    # We can't easily get user_id here without session, so just mark all as potentially offline
    pass

@socketio.on("join_conversation")
def on_join(data):
    cid = (data or {}).get("conversation_id")
    if cid:
        join_room(cid)

@socketio.on("leave_conversation")
def on_leave(data):
    cid = (data or {}).get("conversation_id")
    if cid:
        leave_room(cid)

@socketio.on("typing")
def on_typing(data):
    cid     = (data or {}).get("conversation_id")
    user_id = (data or {}).get("user_id")
    if cid:
        emit("typing_indicator", {"conversation_id": cid, "user_id": user_id}, room=cid, include_self=False)

@socketio.on("get_presence")
def on_get_presence(data):
    user_ids = (data or {}).get("user_ids", [])
    statuses = {uid: _presence.get(uid, "offline") for uid in user_ids}
    emit("presence_status", {"statuses": statuses})

@socketio.on("send_message")
def on_send_message(data):
    """Real-time message send via socket — also persists to DB."""
    from flask_jwt_extended import decode_token
    token = (data or {}).get("token") or request.args.get("token")
    if not token:
        emit("error", {"message": "Authentication required"})
        return
    try:
        decoded = decode_token(token)
        user_id = decoded.get("sub")
    except Exception:
        emit("error", {"message": "Invalid token"})
        return

    cid  = (data or {}).get("conversation_id")
    text = ((data or {}).get("text") or "").strip()
    if not cid or not text or len(text) > 4000:
        emit("error", {"message": "Invalid message"})
        return
    if not ConversationParticipant.query.filter_by(conversation_id=cid, user_id=user_id).first():
        emit("error", {"message": "Not a participant"})
        return

    with app.app_context():
        classification = groq_classify(text)
        sentiment      = groq_sentiment(text) if classification["label"] == "clean" else {"label": "neutral", "score": 0.5, "explanation": ""}
        flagged        = classification["label"] in ("spam", "toxic")

        msg = Message(id=str(uuid.uuid4()), conversation_id=cid, sender_id=user_id, text=text, flagged=flagged, sentiment_label=sentiment["label"], sentiment_score=sentiment["score"])
        db.session.add(msg)
        db.session.commit()
        msg_dict = msg.to_dict()

        if not flagged:
            socketio.emit("new_message", msg_dict, room=cid)
        else:
            socketio.emit("message_flagged", {"message_id": msg.id, "label": classification["label"]}, room="moderators")

        sender = User.query.get(user_id)
        others = ConversationParticipant.query.filter_by(conversation_id=cid).filter(ConversationParticipant.user_id != user_id).all()
        for p in others:
            n = Notification(user_id=p.user_id, type="new_message", payload={"conversation_id": cid, "message_id": msg.id, "sender_name": sender.name if sender else "Someone", "preview": text[:60]})
            db.session.add(n)
        db.session.commit()

# ---------------------------------------------------------------------------
# Seed Demo Data
# ---------------------------------------------------------------------------
def seed_demo_data():
    """Create demo user and sample conversations if DB is empty."""
    if User.query.count() > 0:
        return

    # Demo user
    demo = User(
        id=str(uuid.uuid4()), email="demo@chatapp.com", name="Demo User",
        password_hash=bcrypt.hashpw(b"demo123", bcrypt.gensalt(10)).decode(),
        role="user", status="Online", bio="This is a demo account for ChatFlow AI",
    )
    admin = User(
        id=str(uuid.uuid4()), email="admin@chatapp.com", name="Admin User",
        password_hash=bcrypt.hashpw(b"admin123", bcrypt.gensalt(10)).decode(),
        role="admin", status="Managing the platform",
    )
    alice = User(
        id=str(uuid.uuid4()), email="alice@chatapp.com", name="Alice Chen",
        password_hash=bcrypt.hashpw(b"password123", bcrypt.gensalt(10)).decode(),
        role="user", status="Designing the future",
    )
    bob = User(
        id=str(uuid.uuid4()), email="bob@chatapp.com", name="Bob Martinez",
        password_hash=bcrypt.hashpw(b"password123", bcrypt.gensalt(10)).decode(),
        role="user", status="Coding away",
    )
    db.session.add_all([demo, admin, alice, bob])
    db.session.flush()

    # Demo conversations
    conv1 = Conversation(id=str(uuid.uuid4()), name="Alice Chen", type="direct")
    conv2 = Conversation(id=str(uuid.uuid4()), name="Dev Team", type="group")
    db.session.add_all([conv1, conv2])
    db.session.flush()

    # Participants
    for uid in [demo.id, alice.id]:
        db.session.add(ConversationParticipant(conversation_id=conv1.id, user_id=uid))
    for uid in [demo.id, alice.id, bob.id, admin.id]:
        db.session.add(ConversationParticipant(conversation_id=conv2.id, user_id=uid))
    db.session.flush()

    # Seed messages
    seed_msgs = [
        Message(id=str(uuid.uuid4()), conversation_id=conv1.id, sender_id=alice.id, text="Hey! Did you check the new design mockups?", sentiment_label="positive", sentiment_score=0.82),
        Message(id=str(uuid.uuid4()), conversation_id=conv1.id, sender_id=demo.id,  text="Yeah, they look great! Really love the new color palette.", sentiment_label="positive", sentiment_score=0.91),
        Message(id=str(uuid.uuid4()), conversation_id=conv1.id, sender_id=alice.id, text="Are we still on for the review meeting at 3?", sentiment_label="neutral", sentiment_score=0.65),
        Message(id=str(uuid.uuid4()), conversation_id=conv1.id, sender_id=demo.id,  text="Absolutely! I will have my notes ready.", sentiment_label="positive", sentiment_score=0.78),
        Message(id=str(uuid.uuid4()), conversation_id=conv2.id, sender_id=admin.id, text="Good morning team! Standup in 10 mins 🚀", sentiment_label="positive", sentiment_score=0.88),
        Message(id=str(uuid.uuid4()), conversation_id=conv2.id, sender_id=bob.id,   text="On my way!", sentiment_label="positive", sentiment_score=0.72),
        Message(id=str(uuid.uuid4()), conversation_id=conv2.id, sender_id=alice.id, text="Sprint planning at 3pm — bring your estimates", sentiment_label="neutral", sentiment_score=0.61),
    ]
    db.session.add_all(seed_msgs)
    db.session.commit()
    print("[ChatFlow AI] Demo data seeded: demo@chatapp.com / demo123")

# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("\n" + "="*60)
    print("  ChatFlow AI - Local Backend Server")
    print("  Port: 5001  |  DB: SQLite (chatapp.db)")
    print(f"  AI: {'✓ Groq ' + GROQ_MODEL if GROQ_API_KEY else '✗ No API key (add GROQ_API_KEY to .env)'}")
    print("="*60 + "\n")
    with app.app_context():
        db.create_all()
        seed_demo_data()
    socketio.run(app, host="0.0.0.0", port=5001, debug=False, allow_unsafe_werkzeug=True)
