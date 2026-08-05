"""
Smart reply suggestion generator.

Uses the Groq API (LLaMA 3.3/3.1) to generate 2-3 contextual reply suggestions
for an incoming message. Results are cached in Redis for 60 seconds to avoid
repeated LLM calls for identical inputs (semantic/exact caching).

generate_smart_replies(text, context) -> list[str]
was_cache_hit(text) -> bool   (for usage stat tracking)
"""

import hashlib
import json
import logging
import os
import time

import redis as redis_lib

logger = logging.getLogger(__name__)

_CACHE_TTL    = 60   # seconds
_GROQ_TIMEOUT = 5    # seconds
_FALLBACK_REPLIES = [
    "Sure, sounds good!",
    "Thanks for letting me know.",
    "Got it, I'll follow up soon.",
]

_redis_client = None
_groq_client  = None
_last_cache_hit = False


def _get_redis() -> redis_lib.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis_lib.from_url(
            os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
            decode_responses=True,
        )
    return _redis_client


def _get_groq():
    global _groq_client
    if _groq_client is None:
        from groq import Groq
        _groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
    return _groq_client


def _cache_key(text: str) -> str:
    """SHA-256 hash of the input text — first 16 hex chars as cache key."""
    return "smartreply:" + hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def was_cache_hit(text: str) -> bool:
    """Return True if the last call to generate_smart_replies was a cache hit."""
    return _last_cache_hit


def generate_smart_replies(text: str, context: list[str] | None = None) -> list[str]:
    """
    Generate 2-3 contextual reply suggestions for an incoming message.

    Args:
        text:    The incoming message text to reply to.
        context: Optional list of recent messages for context (last 5 used).

    Returns:
        List of 2-3 reply suggestion strings.
        Falls back to generic replies on Groq error or timeout.
    """
    global _last_cache_hit

    if not text or not text.strip():
        _last_cache_hit = False
        return _FALLBACK_REPLIES

    # Check Redis cache
    rd        = _get_redis()
    cache_key = _cache_key(text)
    try:
        cached = rd.get(cache_key)
        if cached:
            _last_cache_hit = True
            return json.loads(cached)
    except Exception as e:
        logger.warning("Redis cache read failed: %s", e)

    _last_cache_hit = False

    # Build prompt
    context_messages = []
    if context:
        for ctx_msg in (context or [])[-5:]:
            context_messages.append({"role": "user", "content": ctx_msg})

    system_prompt = (
        "You are a smart reply assistant. Generate exactly 3 short, natural, "
        "contextually appropriate reply suggestions for the following message. "
        "Each reply should be 1-10 words. Return them as a JSON array of strings, "
        "e.g. [\"Sure!\", \"Sounds good.\", \"Let me check.\"] "
        "Return ONLY the JSON array, no explanation."
    )

    try:
        groq   = _get_groq()
        model  = os.environ.get("GROQ_MODEL", "llama3-70b-8192")
        resp   = groq.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                *context_messages,
                {"role": "user", "content": text},
            ],
            max_tokens=100,
            timeout=_GROQ_TIMEOUT,
        )
        content = resp.choices[0].message.content.strip()
        replies = _parse_suggestions(content)

        # Cache the result
        try:
            rd.setex(cache_key, _CACHE_TTL, json.dumps(replies))
        except Exception:
            pass

        return replies

    except Exception as e:
        logger.error("Groq smart reply failed: %s", e)
        # Log to LangSmith if available
        _log_failure_to_langsmith(text, str(e))
        return _FALLBACK_REPLIES


def _parse_suggestions(content: str) -> list[str]:
    """Parse the LLM JSON response into a list of suggestion strings."""
    try:
        suggestions = json.loads(content)
        if isinstance(suggestions, list):
            return [str(s).strip() for s in suggestions[:3]]
    except json.JSONDecodeError:
        pass

    # Fallback: split by newline or comma
    lines = [l.strip().strip('"\'') for l in content.replace(",", "\n").splitlines()]
    lines = [l for l in lines if l and not l.startswith("[") and not l.startswith("]")]
    return (lines[:3] if lines else _FALLBACK_REPLIES)


def _log_failure_to_langsmith(text: str, error: str):
    """Best-effort LangSmith failure logging."""
    try:
        api_key = os.environ.get("LANGSMITH_API_KEY")
        if not api_key:
            return
        from langsmith import Client
        client = Client(api_key=api_key)
        client.create_run(
            name="smart_reply_failure",
            inputs={"text": text[:200]},
            outputs={"error": error},
            run_type="llm",
        )
    except Exception:
        pass
