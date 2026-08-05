"""
Pytest configuration and shared fixtures for backend-flask tests.

Fixtures:
    app       — Flask app configured for testing (SQLite in-memory DB)
    client    — Flask test client
    rd        — Mock Redis client (no real Redis needed in unit tests)
    auth_headers(role) — Returns Authorization headers for a given role
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture(scope="session")
def app():
    """Create a Flask app instance configured for testing."""
    from app import create_app

    test_config = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SQLALCHEMY_BINDS": {"analytics": "sqlite:///:memory:"},
        "JWT_SECRET_KEY": "test-jwt-secret",
        "JWT_REFRESH_SECRET_KEY": "test-refresh-secret",
        "REDIS_URL": "redis://localhost:6379/15",  # patched below
        "WTF_CSRF_ENABLED": False,
    }

    with patch("redis.from_url") as mock_redis_factory:
        # Provide a mock Redis so tests don't need a real Redis instance
        mock_rd = MagicMock()
        mock_rd.get.return_value = None
        mock_rd.incr.return_value = 1
        mock_rd.ttl.return_value = 60
        mock_rd.setex.return_value = True
        mock_rd.expire.return_value = True
        mock_rd.pipeline.return_value.__enter__ = MagicMock(return_value=mock_rd)
        mock_rd.pipeline.return_value.__exit__ = MagicMock(return_value=False)
        mock_rd.pipeline.return_value.execute.return_value = [1, 60]
        mock_redis_factory.return_value = mock_rd

        flask_app = create_app(test_config)

    with flask_app.app_context():
        from app.models import db
        db.create_all()
        yield flask_app
        db.drop_all()


@pytest.fixture()
def client(app):
    """Return a Flask test client."""
    return app.test_client()


@pytest.fixture()
def mock_redis():
    """Return a fresh mock Redis client for individual test control."""
    mock_rd = MagicMock()
    mock_rd.get.return_value = None
    mock_rd.incr.return_value = 1
    mock_rd.ttl.return_value = 60
    mock_rd.setex.return_value = True
    mock_rd.expire.return_value = True
    mock_rd.pipeline.return_value.execute.return_value = [1, 60]
    return mock_rd


@pytest.fixture()
def registered_user(client):
    """Register a test user and return the response data."""
    resp = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "name": "Test User",
        "password": "password123"
    })
    assert resp.status_code == 201
    return resp.get_json()


@pytest.fixture()
def auth_tokens(client, registered_user):
    """Log in the test user and return access + refresh tokens."""
    resp = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    assert resp.status_code == 200
    return resp.get_json()


@pytest.fixture()
def auth_headers(auth_tokens):
    """Return Authorization headers for the test user."""
    return {"Authorization": f"Bearer {auth_tokens['access_token']}"}


@pytest.fixture()
def refresh_headers(auth_tokens):
    """Return Authorization headers using the refresh token."""
    return {"Authorization": f"Bearer {auth_tokens['refresh_token']}"}
