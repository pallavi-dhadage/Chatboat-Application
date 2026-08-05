"""
Tests for analytics endpoint and sentiment wiring.
"""
from unittest.mock import MagicMock, patch


class TestAnalyticsEndpoint:
    def test_analytics_requires_admin(self, client, auth_headers):
        resp = client.get("/api/v1/analytics", headers=auth_headers)
        assert resp.status_code == 403

    def test_analytics_returns_required_keys(self, client, app):
        """Admin user should receive all required metric keys."""
        from tests.test_routes import _register_and_login
        headers = _register_and_login(client, "analytics_admin@example.com", role="admin")

        mock_metrics = {
            "message_volume":        100,
            "active_users":          10,
            "sentiment_trend":       [],
            "response_time_ms":      250.0,
            "flagged_message_count": 3,
        }

        with patch("analytics_engine.compute_metrics", return_value=mock_metrics, create=True):
            resp = client.get("/api/v1/analytics", headers=headers)

        assert resp.status_code == 200
        data = resp.get_json()
        for key in ("message_volume", "active_users", "sentiment_trend",
                    "response_time_ms", "flagged_message_count"):
            assert key in data, f"Missing key: {key}"
        assert "ai_insights" in data

    def test_analytics_403_for_regular_user(self, client, auth_headers):
        resp = client.get("/api/v1/analytics", headers=auth_headers)
        assert resp.status_code == 403

    def test_analytics_403_for_moderator(self, client):
        from tests.test_routes import _register_and_login
        headers = _register_and_login(client, "analytics_mod@example.com", role="moderator")
        resp = client.get("/api/v1/analytics", headers=headers)
        assert resp.status_code == 403
