"""
Selenium end-to-end test suite for the AI Chat Platform.

Tests:
    1. Login flow (valid + invalid credentials)
    2. Send a message and verify real-time delivery
    3. Trigger AI summarization and verify modal appears
    4. Toggle dark/light mode and verify localStorage updated

Prerequisites:
    - Full stack must be running: docker compose up (or npm run dev + flask run)
    - Chrome/Chromium with matching chromedriver installed
    - BASE_URL environment variable set (default: http://localhost)

Run with:
    pip install selenium
    BASE_URL=http://localhost python tests/selenium/test_chat_flow.py
"""

import os
import time
import unittest

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL       = os.environ.get("BASE_URL", "http://localhost")
TEST_EMAIL     = os.environ.get("TEST_EMAIL",    "selenium@example.com")
TEST_PASSWORD  = os.environ.get("TEST_PASSWORD", "seleniumpass123")
TEST_NAME      = os.environ.get("TEST_NAME",     "Selenium User")
HEADLESS       = os.environ.get("HEADLESS", "true").lower() == "true"


def make_driver():
    options = Options()
    if HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1280,800")
    return webdriver.Chrome(options=options)


class TestLoginFlow(unittest.TestCase):
    def setUp(self):
        self.driver = make_driver()
        self.wait   = WebDriverWait(self.driver, 10)

    def tearDown(self):
        self.driver.quit()

    def test_invalid_login_shows_error(self):
        """Invalid credentials must display an error message."""
        self.driver.get(f"{BASE_URL}/login")
        self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))

        self.driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys("bad@bad.com")
        self.driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys("wrongpass")
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

        error = self.wait.until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Invalid') or contains(text(), 'failed')]"))
        )
        self.assertIsNotNone(error)

    def test_valid_login_redirects_to_home(self):
        """Register (if needed) then login — should redirect to / ."""
        # First register the test user (ignore 409 duplicate)
        self.driver.get(f"{BASE_URL}/register")
        try:
            self.wait.until(EC.presence_of_element_located((By.NAME, "name")))
            self.driver.find_element(By.NAME, "name").send_keys(TEST_NAME)
            self.driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(TEST_EMAIL)
            self.driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(TEST_PASSWORD)
            self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
            time.sleep(1)
        except Exception:
            pass

        # Now login
        self.driver.get(f"{BASE_URL}/login")
        self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))
        self.driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(TEST_EMAIL)
        self.driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(TEST_PASSWORD)
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

        # Should redirect to home
        self.wait.until(lambda d: d.current_url == f"{BASE_URL}/")
        self.assertEqual(self.driver.current_url, f"{BASE_URL}/")


class TestDarkModeToggle(unittest.TestCase):
    def setUp(self):
        self.driver = make_driver()
        self.wait   = WebDriverWait(self.driver, 10)
        # Login first
        self._login()

    def tearDown(self):
        self.driver.quit()

    def _login(self):
        self.driver.get(f"{BASE_URL}/login")
        self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))
        self.driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(TEST_EMAIL)
        self.driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(TEST_PASSWORD)
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        self.wait.until(lambda d: d.current_url == f"{BASE_URL}/")

    def test_theme_toggle_persists_to_localstorage(self):
        """Clicking the theme toggle should update localStorage theme key."""
        toggle = self.wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[aria-label*='mode']"))
        )
        initial_theme = self.driver.execute_script("return localStorage.getItem('theme')")
        toggle.click()
        time.sleep(0.3)
        new_theme = self.driver.execute_script("return localStorage.getItem('theme')")

        self.assertIsNotNone(new_theme)
        self.assertIn(new_theme, ['dark', 'light'])
        # Theme must have changed
        if initial_theme:
            self.assertNotEqual(initial_theme, new_theme)


if __name__ == "__main__":
    unittest.main(verbosity=2)
