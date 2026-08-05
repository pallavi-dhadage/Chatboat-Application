"""
Django admin registration for the Chat User model.

Provides:
    - List display with id, email, name, role, status, created_at, deleted_at
    - Role-based filtering and email/name search
    - Custom admin actions: deactivate_users, activate_users, assign_role_*
"""

from datetime import datetime, timezone

from django.contrib import admin
from django.utils.html import format_html

from .models import ChatUser


@admin.register(ChatUser)
class ChatUserAdmin(admin.ModelAdmin):
    list_display = (
        "id_short", "email", "name", "role_badge",
        "status", "created_at", "is_active_icon",
    )
    list_filter  = ("role",)
    search_fields = ("email", "name")
    readonly_fields = ("id", "password_hash", "created_at")
    ordering = ("-created_at",)

    fieldsets = (
        ("Identity", {
            "fields": ("id", "email", "name", "role"),
        }),
        ("Profile", {
            "fields": ("avatar_url", "status", "bio"),
        }),
        ("Account Status", {
            "fields": ("created_at", "deleted_at"),
        }),
    )

    actions = ["deactivate_users", "activate_users",
               "make_user", "make_moderator", "make_admin"]

    # -----------------------------------------------------------------------
    # Display helpers
    # -----------------------------------------------------------------------

    def id_short(self, obj):
        return obj.id[:8] + "…"
    id_short.short_description = "ID"

    def role_badge(self, obj):
        colours = {"admin": "#c0392b", "moderator": "#e67e22", "user": "#27ae60"}
        colour  = colours.get(obj.role, "#7f8c8d")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;'
            'border-radius:4px;font-size:11px">{}</span>',
            colour, obj.role.upper()
        )
    role_badge.short_description = "Role"

    def is_active_icon(self, obj):
        return format_html("✅") if obj.is_active else format_html("🚫")
    is_active_icon.short_description = "Active"

    # -----------------------------------------------------------------------
    # Admin actions
    # -----------------------------------------------------------------------

    @admin.action(description="Deactivate selected users")
    def deactivate_users(self, request, queryset):
        count = queryset.filter(deleted_at__isnull=True).update(
            deleted_at=datetime.now(timezone.utc)
        )
        self.message_user(request, f"{count} user(s) deactivated.")

    @admin.action(description="Reactivate selected users")
    def activate_users(self, request, queryset):
        count = queryset.update(deleted_at=None)
        self.message_user(request, f"{count} user(s) reactivated.")

    @admin.action(description="Set role → user")
    def make_user(self, request, queryset):
        queryset.update(role="user")
        self.message_user(request, "Role set to 'user'.")

    @admin.action(description="Set role → moderator")
    def make_moderator(self, request, queryset):
        queryset.update(role="moderator")
        self.message_user(request, "Role set to 'moderator'.")

    @admin.action(description="Set role → admin")
    def make_admin(self, request, queryset):
        queryset.update(role="admin")
        self.message_user(request, "Role set to 'admin'.")
