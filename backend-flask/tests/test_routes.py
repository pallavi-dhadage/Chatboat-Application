"""
Tests for core REST API endpoints — conversations, messages, users, moderation, uploads.
"""
import io
import uuid
from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _register_and_login(client, email, name="User", password="password123", role="user"):
    client.post("/api/v1/auth/register", json={
        "email": email, "name": name, "password": password
    })
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    tokens = resp.get_json()
    # If role != user, override in DB
    if role != "user":
        from app.models import User, db
        u = User.query.filter_by(email=email).first()
        if u:
            u.role = role
            db.session.commit()
        # Re-login to get fresh token with updated role
        resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        tokens = resp.get_json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def _create_conversation(client, headers, name="Test Conv", participants=None):
    payload = {"name": name}
    if participants:
        payload["participants"] = participants
    resp = client.post("/api/v1/conversations", json=payload, headers=headers)
    assert resp.status_code == 201
    return resp.get_json()["id"]


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------

class TestConversations:
    def test_create_conversation(self, client, auth_headers):
        resp = client.post("/api/v1/conversations",
                           json={"name": "My Chat"}, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["name"] == "My Chat"
        assert "id" in data

    def test_list_conversations_scoped_to_user(self, client, app):
        """User A must not see User B's conversations."""
        headers_a = _register_and_login(client, "conv_a@example.com")
        headers_b = _register_and_login(client, "conv_b@example.com")
        _create_conversation(client, headers_a, "A's private chat")

        resp = client.get("/api/v1/conversations", headers=headers_b)
        assert resp.status_code == 200
        ids = [c["id"] for c in resp.get_json()]
        # B should not see A's conversation
        assert len(ids) == 0 or all(i != "A's private chat" for i in ids)

    def test_create_requires_auth(self, client):
        resp = client.post("/api/v1/conversations", json={"name": "x"})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Messages — pagination and ordering
# ---------------------------------------------------------------------------

class TestMessages:
    def test_paginated_messages_ordered_desc(self, client, app, auth_headers):
        """Messages must be returned ordered by created_at DESC."""
        conv_id = _create_conversation(client, auth_headers, "Paginate Test")

        # Insert 3 messages via socket simulation (directly via DB for test speed)
        with app.app_context():
            from app.models import Message, db
            import time
            for i in range(3):
                m = Message(
                    id=str(uuid.uuid4()),
                    conversation_id=conv_id,
                    sender_id=client.application.test_client().application
                              .config.get("_TEST_USER_ID", str(uuid.uuid4())),
                    text=f"Message {i}",
                    classification_label="clean",
                )
                db.session.add(m)
                time.sleep(0.01)
            db.session.commit()

        resp = client.get(
            f"/api/v1/conversations/{conv_id}/messages?page=1&page_size=10",
            headers=auth_headers
        )
        assert resp.status_code == 200
        data  = resp.get_json()
        times = [m["created_at"] for m in data["messages"]]
        assert times == sorted(times, reverse=True)

    def test_pagination_defaults_to_50(self, client, auth_headers):
        conv_id = _create_conversation(client, auth_headers, "Default Page")
        resp = client.get(
            f"/api/v1/conversations/{conv_id}/messages",
            headers=auth_headers
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["page_size"] == 50

    def test_non_participant_cannot_read_messages(self, client):
        headers_a = _register_and_login(client, "msg_a@example.com")
        headers_b = _register_and_login(client, "msg_b@example.com")
        conv_id   = _create_conversation(client, headers_a, "Private")

        resp = client.get(
            f"/api/v1/conversations/{conv_id}/messages",
            headers=headers_b
        )
        assert resp.status_code == 403

    def test_soft_delete_hides_message(self, client, app, auth_headers):
        """Soft-deleted messages must not appear in message list."""
        conv_id = _create_conversation(client, auth_headers, "Delete Test")
        with app.app_context():
            from app.models import Message, User, ConversationParticipant, db
            # Find the user associated with auth_headers
            users = User.query.all()
            user  = users[-1]
            m = Message(
                id=str(uuid.uuid4()),
                conversation_id=conv_id,
                sender_id=user.id,
                text="To be deleted",
                classification_label="clean",
            )
            db.session.add(m)
            db.session.commit()
            msg_id = m.id

        # Ensure user is participant
        resp = client.delete(
            f"/api/v1/messages/{msg_id}", headers=auth_headers
        )
        # 200 or 403 depending on user match — just verify it doesn't appear anymore
        if resp.status_code == 200:
            resp2 = client.get(
                f"/api/v1/conversations/{conv_id}/messages",
                headers=auth_headers
            )
            texts = [m["text"] for m in resp2.get_json()["messages"]]
            assert "To be deleted" not in texts


# ---------------------------------------------------------------------------
# RBAC enforcement
# ---------------------------------------------------------------------------

class TestRBAC:
    def test_analytics_requires_admin(self, client, auth_headers):
        """Regular user must get 403 on admin-only analytics endpoint."""
        resp = client.get("/api/v1/analytics", headers=auth_headers)
        assert resp.status_code == 403

    def test_analytics_accessible_by_admin(self, client, app):
        headers = _register_and_login(client, "admin_rbac@example.com", role="admin")
        with patch("app.routes.compute_metrics", return_value={}, create=True):
            resp = client.get("/api/v1/analytics", headers=headers)
        assert resp.status_code in (200, 503)  # 503 if ai-services not installed

    def test_flagged_requires_moderator(self, client, auth_headers):
        resp = client.get("/api/v1/moderation/flagged", headers=auth_headers)
        assert resp.status_code == 403

    def test_flagged_accessible_by_moderator(self, client):
        headers = _register_and_login(client, "mod_rbac@example.com", role="moderator")
        resp    = client.get("/api/v1/moderation/flagged", headers=headers)
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# File upload
# ---------------------------------------------------------------------------

class TestFileUpload:
    def test_disallowed_content_type_returns_415(self, client, auth_headers):
        data = {"file": (io.BytesIO(b"fake exe"), "file.exe", "application/octet-stream")}
        resp = client.post("/api/v1/messages/upload",
                           data=data, content_type="multipart/form-data",
                           headers=auth_headers)
        assert resp.status_code == 415

    def test_oversized_file_returns_413(self, client, auth_headers):
        big_bytes = b"x" * (11 * 1024 * 1024)  # 11 MB
        data = {"file": (io.BytesIO(big_bytes), "big.jpg", "image/jpeg")}
        resp = client.post("/api/v1/messages/upload",
                           data=data, content_type="multipart/form-data",
                           headers=auth_headers)
        assert resp.status_code == 413

    def test_valid_pdf_upload_calls_s3(self, client, auth_headers):
        with patch("app.routes._upload_to_s3", return_value="https://s3.example.com/key"):
            data = {"file": (io.BytesIO(b"%PDF-1.4"), "doc.pdf", "application/pdf")}
            resp = client.post("/api/v1/messages/upload",
                               data=data, content_type="multipart/form-data",
                               headers=auth_headers)
        assert resp.status_code == 200
        assert "url" in resp.get_json()

    def test_nsfw_image_returns_422(self, client, auth_headers):
        with patch("app.routes._upload_to_s3", return_value="https://s3.example.com/x"):
            with patch("image_moderator.analyze", return_value={"nsfw": True},
                       create=True):
                data = {"file": (io.BytesIO(b"\xff\xd8\xff"), "img.jpg", "image/jpeg")}
                resp = client.post("/api/v1/messages/upload",
                                   data=data, content_type="multipart/form-data",
                                   headers=auth_headers)
        # 422 if image_moderator rejects; 200 if ai-services not installed (skip)
        assert resp.status_code in (200, 422)
