"""
Security middleware and RBAC utilities for the Chat_Service.

Provides:
    apply_security_headers(response) — after_request hook that adds CSP,
        X-Content-Type-Options, and X-Frame-Options to every response.

    require_role(*roles) — decorator factory for RBAC enforcement. Extracts
        the role claim from the current JWT and returns HTTP 403 if the
        caller's role is not in the allowed set.

    validate_text_input(max_length) — decorator that rejects request bodies
        whose 'text' field exceeds max_length characters (default 4000).
"""

from functools import wraps

from flask import jsonify, request, Response
from flask_jwt_extended import get_jwt, verify_jwt_in_request

# Role hierarchy — higher index = more privileged
_ROLE_HIERARCHY = {"user": 0, "moderator": 1, "admin": 2}


# ---------------------------------------------------------------------------
# Security headers middleware
# ---------------------------------------------------------------------------

def apply_security_headers(response: Response) -> Response:
    """
    Attach security headers to every HTTP response.

    Headers applied (Requirement 19.3):
        Content-Security-Policy  — restricts resource loading origins
        X-Content-Type-Options   — prevents MIME-type sniffing
        X-Frame-Options          — prevents clickjacking
        X-XSS-Protection         — legacy XSS filter hint
        Referrer-Policy          — controls referrer information leakage
    """
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "connect-src 'self' wss: ws:; "   # allow WebSocket connections
        "img-src 'self' data: https:; "   # allow S3 image URLs
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self';"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ---------------------------------------------------------------------------
# RBAC decorator factory
# ---------------------------------------------------------------------------

def require_role(*allowed_roles: str):
    """
    Decorator factory that enforces role-based access control.

    Extracts the 'role' claim from the current JWT and returns HTTP 403
    if the caller's role is not in allowed_roles.

    Usage:
        @routes_bp.route("/api/v1/analytics")
        @jwt_required()
        @require_role("admin")
        def analytics():
            ...

        @routes_bp.route("/api/v1/moderation/flagged")
        @jwt_required()
        @require_role("moderator", "admin")
        def flagged_messages():
            ...

    Args:
        *allowed_roles: One or more role strings that are permitted.

    Returns:
        Decorated function that checks role before executing.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # jwt_required() must have already run — we just read the claims
            claims      = get_jwt()
            caller_role = claims.get("role", "user")

            if caller_role not in allowed_roles:
                required_display = " or ".join(f"'{r}'" for r in allowed_roles)
                return jsonify({
                    "error": f"Access denied. Required role: {required_display}."
                }), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator


# ---------------------------------------------------------------------------
# Input validation decorator
# ---------------------------------------------------------------------------

def validate_text_input(max_length: int = 4000, field: str = "text"):
    """
    Decorator that validates the length of a JSON body field.

    Rejects requests where the specified field exceeds max_length characters
    with HTTP 400 (Requirement 19.2).

    Args:
        max_length: Maximum allowed character count (default 4000).
        field:      The JSON body field to validate (default 'text').

    Usage:
        @routes_bp.route("/api/v1/conversations", methods=["POST"])
        @jwt_required()
        @validate_text_input(max_length=200, field="name")
        def create_conversation():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json(silent=True) or {}
            value = data.get(field)
            if value and len(str(value)) > max_length:
                return jsonify({
                    "error": f"'{field}' exceeds maximum length of {max_length} characters."
                }), 400
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# ---------------------------------------------------------------------------
# Participant access check helper
# ---------------------------------------------------------------------------

def assert_conversation_participant(user_id: str, conversation_id: str):
    """
    Return the ConversationParticipant record or raise a 403 abort.

    Used by endpoints that must verify the caller is a member of the
    conversation before returning data (Requirement 2.3).

    Args:
        user_id:         The authenticated user's ID.
        conversation_id: The conversation to check membership in.

    Returns:
        ConversationParticipant row if the user is a participant.

    Raises:
        Flask abort(403) if the user is not a participant.
    """
    from flask import abort
    from .models import ConversationParticipant

    cp = ConversationParticipant.query.filter_by(
        conversation_id=conversation_id,
        user_id=user_id
    ).first()

    if not cp:
        abort(403, description="You are not a participant in this conversation.")

    return cp
