"""
Django User model for the Admin_Service.

Uses managed=False so Django reads from the existing PostgreSQL table
created by Flask-Migrate (Alembic) — no duplicate migration conflicts.
"""

from django.db import models


class ChatUser(models.Model):
    """
    Mirrors the Flask 'users' table. managed=False means Django will never
    CREATE or DROP this table — Alembic owns the schema.
    """
    id            = models.CharField(max_length=36, primary_key=True)
    email         = models.EmailField(max_length=255, unique=True)
    name          = models.CharField(max_length=100)
    role          = models.CharField(
        max_length=20,
        choices=[("user", "User"), ("moderator", "Moderator"), ("admin", "Admin")],
        default="user",
    )
    password_hash = models.CharField(max_length=72)
    avatar_url    = models.TextField(null=True, blank=True)
    status        = models.CharField(max_length=100, null=True, blank=True)
    bio           = models.TextField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=False)
    deleted_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed  = False        # Alembic owns this table — Django never touches it
        db_table = "users"      # Must match the Flask model's __tablename__
        verbose_name        = "Chat User"
        verbose_name_plural = "Chat Users"
        ordering            = ["-created_at"]

    def __str__(self):
        return f"{self.name} <{self.email}> [{self.role}]"

    @property
    def is_active(self):
        return self.deleted_at is None
