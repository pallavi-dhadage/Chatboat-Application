"""
Basic Django admin accessibility test.
"""
from django.test import TestCase, Client
from django.contrib.auth import get_user_model


class AdminPanelTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin_user = User.objects.create_superuser(
            username="testadmin",
            email="testadmin@example.com",
            password="adminpass123",
        )
        self.client = Client()

    def test_admin_login_page_accessible(self):
        """Django admin login page must return HTTP 200."""
        resp = self.client.get("/admin/login/")
        self.assertEqual(resp.status_code, 200)

    def test_admin_panel_accessible_with_credentials(self):
        """Authenticated admin must be able to access /admin/."""
        self.client.force_login(self.admin_user)
        resp = self.client.get("/admin/")
        self.assertIn(resp.status_code, [200, 302])

    def test_health_endpoint(self):
        """Health endpoint must return 200."""
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
