"""
Redis sliding-window rate limiter.

Uses Redis INCR + EXPIRE to implement a fixed-window counter per key.
Returns (allowed: bool, retry_after: int) so callers can set Retry-After headers.

Rate limits (from design doc / .env):
    REST API:   60 requests/minute per authenticated user
    WebSocket:  30 send_message events/minute per user
    Auth routes: 10 requests/minute per IP address (brute-force protection)
"""

import os
import time

import redis as redis_lib
from flask import current_app


def _get_redis() -> redis_lib.Redis:
    """Return a Redis client using the app REDIS_URL config."""
    url = current_app.config.get("REDIS_URL", os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    return redis_lib.from_url(url, decode_responses=True)


def _check_limit(key: str, limit: int, window_seconds: int = 60) -> tuple[bool, int]:
    """
    Increment a fixed-window counter in Redis and check against the limit.

    Args:
        key:            Redis key (e.g., 'ratelimit:rest:user-uuid')
        limit:          Maximum allowed requests in the window
        window_seconds: Duration of the rate-limit window in seconds

    Returns:
        (allowed, retry_after)
        allowed      — True if the request is within the limit
        retry_after  — seconds until the window resets (0 if allowed)
    """
    rd = _get_redis()
    pipe = rd.pipeline()
    pipe.incr(key)
    pipe.ttl(key)
    count, ttl = pipe.execute()

    # Set expiry on the first request in the window
    if count == 1:
        rd.expire(key, window_seconds)
        ttl = window_seconds

    if count > limit:
        retry_after = max(ttl, 1)
        return False, retry_after

    return True, 0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def check_rest_limit(user_id: str) -> tuple[bool, int]:
    """
    Check the REST API rate limit for an authenticated user.

    Limit: 60 requests per minute per user (Requirement 15.1)
    Redis key: ratelimit:rest:{user_id}
    """
    limit = int(current_app.config.get("RATE_LIMIT_REST_RPM",
                                        os.getenv("RATE_LIMIT_REST_RPM", "60")))
    return _check_limit(f"ratelimit:rest:{user_id}", limit, window_seconds=60)


def check_ws_limit(user_id: str) -> tuple[bool, int]:
    """
    Check the WebSocket send_message rate limit for an authenticated user.

    Limit: 30 send_message events per minute per user (Requirement 15.2)
    Redis key: ratelimit:ws:{user_id}
    """
    limit = int(current_app.config.get("RATE_LIMIT_WS_RPM",
                                        os.getenv("RATE_LIMIT_WS_RPM", "30")))
    return _check_limit(f"ratelimit:ws:{user_id}", limit, window_seconds=60)


def check_auth_limit(ip: str) -> tuple[bool, int]:
    """
    Check the unauthenticated auth-route rate limit for an IP address.

    Limit: 10 requests per minute per IP (Requirement 15.5, brute-force protection)
    Redis key: ratelimit:auth:{ip}
    """
    limit = int(current_app.config.get("RATE_LIMIT_AUTH_RPM",
                                        os.getenv("RATE_LIMIT_AUTH_RPM", "10")))
    return _check_limit(f"ratelimit:auth:{ip}", limit, window_seconds=60)


# ---------------------------------------------------------------------------
# Decorator for REST endpoints
# ---------------------------------------------------------------------------

def rest_rate_limit(f):
    """
    Decorator that applies the REST rate limit to a route function.

    Requires the JWT identity to be available (i.e., @jwt_required must
    appear before this decorator in the decorator chain).

    Usage:
        @app.route("/api/v1/some-endpoint")
        @jwt_required()
        @rest_rate_limit
        def some_endpoint():
            ...
    """
    from functools import wraps
    from flask import jsonify
    from flask_jwt_extended import get_jwt_identity

    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = get_jwt_identity()
        if user_id:
            allowed, retry_after = check_rest_limit(user_id)
            if not allowed:
                response = jsonify({"error": "Rate limit exceeded"})
                response.headers["Retry-After"] = str(retry_after)
                return response, 429
        return f(*args, **kwargs)

    return decorated
