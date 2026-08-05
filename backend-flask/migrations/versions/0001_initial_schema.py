"""Initial PostgreSQL schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000

Creates all tables defined in the design document:
  users, conversations, conversation_participants,
  messages, notifications, refresh_tokens

Indexes and CHECK constraints are included.
"""

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # -------------------------------------------------------------------------
    # users
    # -------------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id",            sa.String(36),  primary_key=True),
        sa.Column("email",         sa.String(255), nullable=False),
        sa.Column("name",          sa.String(100), nullable=False),
        sa.Column("role",          sa.String(20),  nullable=False, server_default="user"),
        sa.Column("password_hash", sa.String(72),  nullable=False),
        sa.Column("avatar_url",    sa.Text,         nullable=True),
        sa.Column("status",        sa.String(100),  nullable=True),
        sa.Column("bio",           sa.Text,         nullable=True),
        sa.Column("created_at",    sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column("deleted_at",    sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.CheckConstraint("role IN ('user', 'moderator', 'admin')", name="ck_users_role"),
    )
    op.create_index("idx_users_email", "users", ["email"], unique=True)

    # -------------------------------------------------------------------------
    # conversations
    # -------------------------------------------------------------------------
    op.create_table(
        "conversations",
        sa.Column("id",         sa.String(36),  primary_key=True),
        sa.Column("name",       sa.String(200), nullable=False),
        sa.Column("type",       sa.String(20),  nullable=False, server_default="group"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.CheckConstraint("type IN ('direct', 'group')", name="ck_conversations_type"),
    )

    # -------------------------------------------------------------------------
    # conversation_participants  (join table)
    # -------------------------------------------------------------------------
    op.create_table(
        "conversation_participants",
        sa.Column("conversation_id", sa.String(36), nullable=False),
        sa.Column("user_id",         sa.String(36), nullable=False),
        sa.Column("joined_at",       sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("conversation_id", "user_id"),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"],
                                ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"],
                                ondelete="CASCADE"),
    )

    # -------------------------------------------------------------------------
    # messages
    # -------------------------------------------------------------------------
    op.create_table(
        "messages",
        sa.Column("id",                   sa.String(36), primary_key=True),
        sa.Column("conversation_id",      sa.String(36), nullable=False),
        sa.Column("sender_id",            sa.String(36), nullable=False),
        sa.Column("text",                 sa.Text,        nullable=True),
        sa.Column("file_url",             sa.Text,        nullable=True),
        sa.Column("sentiment_label",      sa.String(20),  nullable=True),
        sa.Column("sentiment_score",      sa.Float,       nullable=True),
        sa.Column("classification_label", sa.String(20),  nullable=True),
        sa.Column("classification_conf",  sa.Float,       nullable=True),
        sa.Column("flagged",              sa.Boolean,     nullable=False,
                  server_default=sa.false()),
        sa.Column("deleted_at",           sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at",           sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"],
                                ondelete="CASCADE", name="fk_messages_conversation"),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"],
                                name="fk_messages_sender"),
        sa.CheckConstraint(
            "sentiment_label IN ('positive', 'neutral', 'negative')",
            name="ck_messages_sentiment_label"
        ),
        sa.CheckConstraint(
            "classification_label IN ('clean', 'spam', 'toxic')",
            name="ck_messages_classification_label"
        ),
    )
    # Indexes for efficient paginated history queries (Req 17.5)
    op.create_index("idx_messages_conversation_id", "messages", ["conversation_id"])
    op.create_index("idx_messages_created_at", "messages", ["created_at"])
    op.create_index("idx_messages_conv_time", "messages",
                    ["conversation_id", "created_at"])

    # -------------------------------------------------------------------------
    # notifications
    # -------------------------------------------------------------------------
    op.create_table(
        "notifications",
        sa.Column("id",         sa.String(36), primary_key=True),
        sa.Column("user_id",    sa.String(36), nullable=False),
        sa.Column("type",       sa.String(50), nullable=False),
        sa.Column("payload",    sa.JSON,        nullable=False),
        sa.Column("read_at",    sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"],
                                ondelete="CASCADE", name="fk_notifications_user"),
    )
    # Partial index on unread notifications only
    op.create_index(
        "idx_notifications_user_unread",
        "notifications",
        ["user_id", "read_at"],
        postgresql_where=sa.text("read_at IS NULL"),
    )

    # -------------------------------------------------------------------------
    # refresh_tokens
    # -------------------------------------------------------------------------
    op.create_table(
        "refresh_tokens",
        sa.Column("jti",        sa.String(36), primary_key=True),
        sa.Column("user_id",    sa.String(36), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"],
                                ondelete="CASCADE", name="fk_refresh_tokens_user"),
    )
    op.create_index("idx_refresh_tokens_user", "refresh_tokens", ["user_id"])


def downgrade() -> None:
    op.drop_table("refresh_tokens")
    op.drop_table("notifications")
    op.drop_table("messages")
    op.drop_table("conversation_participants")
    op.drop_table("conversations")
    op.drop_table("users")
