"""
Django superuser creation script for Docker entrypoint.

Creates a superuser from environment variables if one doesn't already exist.
Called from the Dockerfile CMD / entrypoint before starting gunicorn.

Environment variables:
    DJANGO_SUPERUSER_USERNAME (default: admin)
    DJANGO_SUPERUSER_EMAIL    (default: admin@example.com)
    DJANGO_SUPERUSER_PASSWORD (default: adminpass)
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "chatapp.settings")
django.setup()

from django.contrib.auth import get_user_model

User     = get_user_model()
username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
email    = os.environ.get("DJANGO_SUPERUSER_EMAIL",    "admin@example.com")
password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "adminpass")

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
    print(f"Superuser '{username}' created.")
else:
    print(f"Superuser '{username}' already exists.")
