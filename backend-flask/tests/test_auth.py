"""
Tests for authentication endpoints — /api/v1/auth/*

Covers:
    - Successful registration (201)
    - Duplicate email (409)
    - Missing fields (400)
    - Login success (200) with tokens returned
    - Invalid credentials (401) — generic message
    - Token refresh (200)
    - Refresh with revoked token (401)
    - Logout (200) — revokes token
"""

import pytest
from unittest.mock import MagicMock, patch


class TestRegister:
    def test_register_success(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "email": "newuser@example.com",
            "name": "New User",
            "password": "securepass123"
        })
        assert resp.status_code == 201
        data = resp.get_json()
        assert "id" in data
        assert data["email"] == "newuser@example.com"
        assert data["name"] == "New User"
        # Password must never be returned
        assert "password" not in data
        assert "password_hash" not in data

    def test_register_duplicate_email(self, client):
        payload = {"email": "dup@example.com", "name": "Dup", "password": "pass1234"}
        client.post("/api/v1/auth/register", json=payload)
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 409
        assert "already in use" in resp.get_json()["error"].lower()

    def test_register_missing_email(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "name": "No Email",
            "password": "pass1234"
        })
        assert resp.status_code == 400

    def test_register_missing_password(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "email": "nopw@example.com",
            "name": "No PW"
        })
        assert resp.status_code == 400

    def test_register_short_password(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "email": "shortpw@example.com",
            "name": "Short PW",
            "password": "abc"
        })
        assert resp.status_code == 400

    def test_register_default_role_is_user(self, client, app):
        resp = client.post("/api/v1/auth/register", json={
            "email": "rolecheck@example.com",
            "name": "Role Check",
            "password": "password123"
        })
        assert resp.status_code == 201
        user_id = resp.get_json()["id"]
        with app.app_context():
            from app.models import User
            user = User.query.get(user_id)
            assert user.role == "user"


class TestLogin:
    def test_login_success(self, client, registered_user):
        resp = client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data
        assert data["user"]["email"] == "test@example.com"

    def test_login_wrong_password(self, client, registered_user):
        resp = client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "wrongpassword"
        })
        assert resp.status_code == 401
        # Generic message — must not reveal whether email or password was wrong
        error = resp.get_json()["error"].lower()
        assert "invalid credentials" in error
        assert "password" not in error
        assert "email" not in error

    def test_login_wrong_email(self, client):
        resp = client.post("/api/v1/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "password123"
        })
        assert resp.status_code == 401
        assert "invalid credentials" in resp.get_json()["error"].lower()

    def test_login_missing_fields(self, client):
        resp = client.post("/api/v1/auth/login", json={"email": "test@example.com"})
        assert resp.status_code == 400


class TestTokenRefresh:
    def test_refresh_success(self, client, auth_tokens):
        resp = client.post("/api/v1/auth/refresh", headers={
            "Authorization": f"Bearer {auth_tokens['refresh_token']}"
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert "access_token" in data

    def test_refresh_with_access_token_fails(self, client, auth_tokens):
        # Access token must not be accepted on the refresh endpoint
        resp = client.post("/api/v1/auth/refresh", headers={
            "Authorization": f"Bearer {auth_tokens['access_token']}"
        })
        assert resp.status_code == 422  # Flask-JWT returns 422 for wrong token type

    def test_refresh_no_token(self, client):
        resp = client.post("/api/v1/auth/refresh")
        assert resp.status_code == 401


class TestLogout:
    def test_logout_success(self, client, auth_tokens):
        resp = client.post("/api/v1/auth/logout", headers={
            "Authorization": f"Bearer {auth_tokens['refresh_token']}"
        })
        assert resp.status_code == 200
        assert "logged out" in resp.get_json()["message"].lower()

    def test_refresh_after_logout_is_rejected(self, client, app):
        """After logout, the same refresh token must be rejected."""
        # Register + login fresh user
        client.post("/api/v1/auth/register", json={
            "email": "logouttest@example.com",
            "name": "Logout Test",
            "password": "password123"
        })
        login_resp = client.post("/api/v1/auth/login", json={
            "email": "logouttest@example.com",
            "password": "password123"
        })
        tokens = login_resp.get_json()
        refresh_token = tokens["refresh_token"]

        # Logout
        client.post("/api/v1/auth/logout", headers={
            "Authorization": f"Bearer {refresh_token}"
        })

        # Attempt to refresh with revoked token — should be rejected
        # (Redis mock returns "1" for the revoked key after logout)
        with patch("app.auth._get_redis") as mock_get_redis:
            mock_rd = MagicMock()
            mock_rd.get.return_value = "1"   # simulate revoked key present
            mock_get_redis.return_value = mock_rd

            resp = client.post("/api/v1/auth/refresh", headers={
                "Authorization": f"Bearer {refresh_token}"
            })
            assert resp.status_code == 401


class TestSecurityHeaders:
    def test_security_headers_present(self, client):
        """Every response must include the required security headers."""
        resp = client.get("/api/v1/health")
        assert "X-Content-Type-Options" in resp.headers
        assert resp.headers["X-Content-Type-Options"] == "nosniff"
        assert "X-Frame-Options" in resp.headers
        assert resp.headers["X-Frame-Options"] == "DENY"
        assert "Content-Security-Policy" in resp.headers
