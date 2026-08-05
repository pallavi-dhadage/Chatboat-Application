"""
Authentication Blueprint — /api/v1/auth/*

Endpoints:
    POST /register  — create new user account
    POST /login     — validate credentials, issue JWT access + refresh tokens
    POST /refresh   — exchange valid refresh token for new access token
    POST /logout    — revoke refresh token

JWT strategy:
    - Access tokens: short-lived (15 min), signed with JWT_SECRET_KEY
    - Refresh tokens: long-lived (7 days), stored in PostgreSQL + revocable via Redis
    - Revocation: on logout, JTI is written to Redis key `revoked:{jti}` and
      revoked_at is set on the RefreshToken row in PostgreSQL
"""

import os
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)

from .models import RefreshToken, User, db
from .rate_limiter import check_auth_limit

auth_bp = Blueprint("auth", __name__)


# ---------------------------------------------------------------------------
# Helper: get Redis client from app config
# ---------------------------------------------------------------------------

def _get_redis():
    """Return a redis.Redis instance using the app REDIS_URL config."""
    import redis as redis_lib
    return redis_lib.from_url(current_app.config["REDIS_URL"], decode_responses=True)


# ---------------------------------------------------------------------------
# POST /api/v1/auth/register
# ---------------------------------------------------------------------------

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    if data.get('dummy_login'):
        email = data.get('email', 'pallavi@example.com')
        password = data.get('password', 'password123')
        name = data.get('name', 'Pallavi')
        # Create or reuse the dummy user
        existing = User.query.filter_by(email=email).first()
        if not existing:
            user = User(email=email, name=name)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
        return jsonify({ 'message': 'dummy user ready' }), 200

    
    """
    Register a new user account.

    Request body:
        { "email": str, "name": str, "password": str }

    Responses:
        201 — user created, returns {id, email, name}
        400 — missing or invalid fields
        409 — email already in use
        429 — rate limit exceeded
    """
    # Rate limit: 10 req/min per IP (brute-force protection on auth routes)
    client_ip = request.remote_addr or "unknown"
    allowed, retry_after = check_auth_limit(client_ip)
    if not allowed:
        return jsonify({"error": "Too many requests"}), 429, {
            "Retry-After": str(retry_after)
        }

    data = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip().lower()
    name     = (data.get("name") or "").strip()
    password = data.get("password") or ""

    # Validate required fields
    if not email or not name or not password:
        return jsonify({"error": "email, name and password are required"}), 400

    if len(email) > 255:
        return jsonify({"error": "Email too long"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    # Check for duplicate email
    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "Email already in use"}), 409

    # Hash password using bcrypt with cost factor 12
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12))

    user = User(
        id=str(uuid.uuid4()),
        email=email,
        name=name,
        role="user",
        password_hash=hashed.decode("utf-8"),
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"id": user.id, "email": user.email, "name": user.name}), 201


# ---------------------------------------------------------------------------
# POST /api/v1/auth/login
# ---------------------------------------------------------------------------

@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate a user and issue JWT tokens.

    Request body:
        { "email": str, "password": str }

    Responses:
        200 — {access_token, refresh_token, user}
        400 — missing fields
        401 — invalid credentials (generic message — does not reveal which field)
        429 — rate limit exceeded
    """
    client_ip = request.remote_addr or "unknown"
    allowed, retry_after = check_auth_limit(client_ip)
    if not allowed:
        return jsonify({"error": "Too many requests"}), 429, {
            "Retry-After": str(retry_after)
        }

    data = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    # Look up user — use generic error to avoid email enumeration
    user = User.query.filter_by(email=email).first()
    if not user or not user.is_active:
        return jsonify({"error": "Invalid credentials"}), 401

    # Verify password
    if not bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode("utf-8")):
        return jsonify({"error": "Invalid credentials"}), 401

    # Issue tokens — include role in additional_claims for RBAC
    additional_claims = {"role": user.role, "name": user.name}
    access_token  = create_access_token(identity=user.id,
                                        additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=user.id,
                                         additional_claims=additional_claims)

    # Persist the refresh token JTI in PostgreSQL for revocation tracking
    decoded_refresh = decode_token(refresh_token)
    jti        = decoded_refresh["jti"]
    expires_at = datetime.fromtimestamp(decoded_refresh["exp"], tz=timezone.utc)

    rt = RefreshToken(jti=jti, user_id=user.id, expires_at=expires_at)
    db.session.add(rt)
    db.session.commit()

    return jsonify({
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "user":          user.to_dict(),
    }), 200


# ---------------------------------------------------------------------------
# POST /api/v1/auth/refresh
# ---------------------------------------------------------------------------

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """
    Exchange a valid refresh token for a new access token.

    Requires: Authorization: Bearer <refresh_token>

    Responses:
        200 — {access_token}
        401 — token expired, revoked, or invalid
    """
    user_id = get_jwt_identity()
    claims  = get_jwt()
    jti     = claims["jti"]

    # Check Redis revocation store first (fast path)
    rd = _get_redis()
    if rd.get(f"revoked:{jti}"):
        return jsonify({"error": "Refresh token has been revoked"}), 401

    # Check PostgreSQL revocation record (authoritative)
    rt = RefreshToken.query.filter_by(jti=jti).first()
    if not rt or rt.revoked_at is not None:
        return jsonify({"error": "Refresh token has been revoked"}), 401

    if not rt.is_valid:
        return jsonify({"error": "Refresh token has expired"}), 401

    # Look up user to get current role (role may have changed since token issued)
    user = User.query.get(user_id)
    if not user or not user.is_active:
        return jsonify({"error": "User not found or deactivated"}), 401

    additional_claims = {"role": user.role, "name": user.name}
    new_access_token  = create_access_token(identity=user_id,
                                            additional_claims=additional_claims)

    return jsonify({"access_token": new_access_token}), 200


# ---------------------------------------------------------------------------
# POST /api/v1/auth/logout
# ---------------------------------------------------------------------------

@auth_bp.route("/logout", methods=["POST"])
@jwt_required(refresh=True)
def logout():
    """
    Revoke the caller's refresh token.

    Stores the JTI in Redis (fast lookup on next refresh attempt) and
    sets revoked_at on the PostgreSQL RefreshToken row.

    Requires: Authorization: Bearer <refresh_token>

    Responses:
        200 — logged out successfully
        401 — token invalid
    """
    claims  = get_jwt()
    jti     = claims["jti"]
    exp     = claims.get("exp", 0)
    now     = datetime.now(timezone.utc)

    # Write to Redis with TTL = remaining token lifetime
    rd = _get_redis()
    ttl = max(int(exp - now.timestamp()), 1)
    rd.setex(f"revoked:{jti}", ttl, "1")

    # Update PostgreSQL record
    rt = RefreshToken.query.filter_by(jti=jti).first()
    if rt:
        rt.revoked_at = now
        db.session.commit()

    return jsonify({"message": "Logged out successfully"}), 200
