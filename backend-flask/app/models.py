"""
SQLAlchemy ORM models for the Chat_Service (PostgreSQL).

All models mirror the schema defined in the design document.
Relationships are defined with back_populates for explicit bidirectional access.
"""

import uuid
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def _uuid():
    """Generate a new UUID4 string — used as default primary key."""
    return str(uuid.uuid4())


def _now():
    """Return current UTC datetime — used as default timestamp."""
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class User(db.Model):
    """
    Represents a registered platform user.

    Roles:
        user      — standard participant
        moderator — can view and dismiss flagged messages
        admin     — full privileges + Django admin access
    """
    __tablename__ = "users"

    id            = db.Column(db.String(36), primary_key=True, default=_uuid)
    email         = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name          = db.Column(db.String(100), nullable=False)
    role          = db.Column(
        db.String(20),
        nullable=False,
        default="user",
        # CHECK constraint enforced at DB level (added via CheckConstraint below)
    )
    password_hash = db.Column(db.String(72), nullable=False)   # bcrypt output ≤ 60 chars
    avatar_url    = db.Column(db.Text, nullable=True)
    status        = db.Column(db.String(100), nullable=True)
    bio           = db.Column(db.Text, nullable=True)
    created_at    = db.Column(db.DateTime(timezone=True), nullable=False, default=_now)
    deleted_at    = db.Column(db.DateTime(timezone=True), nullable=True)  # soft-delete

    # Relationships
    sent_messages         = db.relationship("Message", foreign_keys="Message.sender_id",
                                            back_populates="sender", lazy="dynamic")
    conversation_memberships = db.relationship("ConversationParticipant",
                                               back_populates="user", lazy="dynamic")
    notifications         = db.relationship("Notification", back_populates="user",
                                            lazy="dynamic")
    refresh_tokens        = db.relationship("RefreshToken", back_populates="user",
                                            lazy="dynamic")

    # DB-level CHECK constraint on role
    __table_args__ = (
        db.CheckConstraint(
            "role IN ('user', 'moderator', 'admin')",
            name="ck_users_role"
        ),
    )

    @property
    def is_active(self):
        """True if the account has not been soft-deleted."""
        return self.deleted_at is None

    def to_dict(self):
        return {
            "id":         self.id,
            "email":      self.email,
            "name":       self.name,
            "role":       self.role,
            "avatar_url": self.avatar_url,
            "status":     self.status,
            "bio":        self.bio,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<User {self.email} [{self.role}]>"


# ---------------------------------------------------------------------------
# Conversation
# ---------------------------------------------------------------------------

class Conversation(db.Model):
    """
    A named chat thread — either a 1:1 direct message or a group channel.
    """
    __tablename__ = "conversations"

    id         = db.Column(db.String(36), primary_key=True, default=_uuid)
    name       = db.Column(db.String(200), nullable=False)
    type       = db.Column(db.String(20), nullable=False, default="group")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_now)

    # Relationships
    participants = db.relationship("ConversationParticipant",
                                   back_populates="conversation",
                                   cascade="all, delete-orphan",
                                   lazy="dynamic")
    messages     = db.relationship("Message",
                                   back_populates="conversation",
                                   cascade="all, delete-orphan",
                                   lazy="dynamic")

    __table_args__ = (
        db.CheckConstraint(
            "type IN ('direct', 'group')",
            name="ck_conversations_type"
        ),
    )

    def to_dict(self):
        return {
            "id":         self.id,
            "name":       self.name,
            "type":       self.type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Conversation {self.name} [{self.type}]>"


# ---------------------------------------------------------------------------
# ConversationParticipant (join table)
# ---------------------------------------------------------------------------

class ConversationParticipant(db.Model):
    """
    Many-to-many join table between Conversation and User.
    Tracks when a user joined a conversation.
    """
    __tablename__ = "conversation_participants"

    conversation_id = db.Column(
        db.String(36),
        db.ForeignKey("conversations.id", ondelete="CASCADE"),
        primary_key=True
    )
    user_id = db.Column(
        db.String(36),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )
    joined_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_now)

    # Relationships
    conversation = db.relationship("Conversation", back_populates="participants")
    user         = db.relationship("User", back_populates="conversation_memberships")

    def __repr__(self):
        return f"<ConversationParticipant conv={self.conversation_id} user={self.user_id}>"


# ---------------------------------------------------------------------------
# Message
# ---------------------------------------------------------------------------

class Message(db.Model):
    """
    A single message within a Conversation.

    Fields:
        classification_label — set by Scikit-Learn Classifier (clean|spam|toxic)
        classification_conf  — classifier confidence score [0.0, 1.0]
        sentiment_label      — set by TF/Keras Sentiment_Model (positive|neutral|negative)
        sentiment_score      — sentiment confidence score [0.0, 1.0]
        flagged              — True when classification_label is spam or toxic
        deleted_at           — soft-delete timestamp; NULL means message is visible
    """
    __tablename__ = "messages"

    id                   = db.Column(db.String(36), primary_key=True, default=_uuid)
    conversation_id      = db.Column(
        db.String(36),
        db.ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False
    )
    sender_id            = db.Column(
        db.String(36),
        db.ForeignKey("users.id"),
        nullable=False
    )
    text                 = db.Column(db.Text, nullable=True)
    file_url             = db.Column(db.Text, nullable=True)
    sentiment_label      = db.Column(db.String(20), nullable=True)
    sentiment_score      = db.Column(db.Float, nullable=True)
    classification_label = db.Column(db.String(20), nullable=True)
    classification_conf  = db.Column(db.Float, nullable=True)
    flagged              = db.Column(db.Boolean, nullable=False, default=False)
    deleted_at           = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at           = db.Column(db.DateTime(timezone=True), nullable=False,
                                     default=_now, index=True)

    # Relationships
    conversation = db.relationship("Conversation", back_populates="messages")
    sender       = db.relationship("User", foreign_keys=[sender_id],
                                   back_populates="sent_messages")

    __table_args__ = (
        db.CheckConstraint(
            "sentiment_label IN ('positive', 'neutral', 'negative')",
            name="ck_messages_sentiment_label"
        ),
        db.CheckConstraint(
            "classification_label IN ('clean', 'spam', 'toxic')",
            name="ck_messages_classification_label"
        ),
        # Composite index for paginated history queries (design doc Req 17.5)
        db.Index("idx_messages_conv_time", "conversation_id", "created_at"),
        # Single-column indexes
        db.Index("idx_messages_conversation_id", "conversation_id"),
        db.Index("idx_messages_created_at", "created_at"),
    )

    @property
    def is_deleted(self):
        return self.deleted_at is not None

    def to_dict(self):
        return {
            "id":                   self.id,
            "conversation_id":      self.conversation_id,
            "sender_id":            self.sender_id,
            "text":                 self.text,
            "file_url":             self.file_url,
            "sentiment_label":      self.sentiment_label,
            "sentiment_score":      self.sentiment_score,
            "classification_label": self.classification_label,
            "flagged":              self.flagged,
            "deleted_at":           self.deleted_at.isoformat() if self.deleted_at else None,
            "created_at":           self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Message {self.id} conv={self.conversation_id} flagged={self.flagged}>"


# ---------------------------------------------------------------------------
# Notification
# ---------------------------------------------------------------------------

class Notification(db.Model):
    """
    In-app notification record for a User.

    payload is stored as JSON — flexible enough for different notification types:
        new_message   → {conversation_id, sender_name, preview}
        message_flagged → {message_id, conversation_id}
    """
    __tablename__ = "notifications"

    id         = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id    = db.Column(
        db.String(36),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    type       = db.Column(db.String(50), nullable=False)
    payload    = db.Column(db.JSON, nullable=False)
    read_at    = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_now)

    # Relationship
    user = db.relationship("User", back_populates="notifications")

    __table_args__ = (
        # Partial index — only unread notifications (read_at IS NULL)
        # SQLAlchemy renders postgresql_where for partial indexes
        db.Index(
            "idx_notifications_user_unread",
            "user_id",
            "read_at",
            postgresql_where=(db.text("read_at IS NULL"))
        ),
    )

    @property
    def is_read(self):
        return self.read_at is not None

    def to_dict(self):
        return {
            "id":         self.id,
            "user_id":    self.user_id,
            "type":       self.type,
            "payload":    self.payload,
            "read_at":    self.read_at.isoformat() if self.read_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Notification {self.type} user={self.user_id} read={self.is_read}>"


# ---------------------------------------------------------------------------
# RefreshToken
# ---------------------------------------------------------------------------

class RefreshToken(db.Model):
    """
    Tracks issued refresh tokens for revocation support.

    jti (JWT ID) is the unique claim from the JWT payload.
    When a user logs out, revoked_at is set and the JTI is also recorded in Redis
    for fast in-memory lookup without a DB query on every refresh.
    """
    __tablename__ = "refresh_tokens"

    jti        = db.Column(db.String(36), primary_key=True)   # UUID4 from JWT payload
    user_id    = db.Column(
        db.String(36),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    revoked_at = db.Column(db.DateTime(timezone=True), nullable=True)  # NULL = still valid

    # Relationship
    user = db.relationship("User", back_populates="refresh_tokens")

    __table_args__ = (
        db.Index("idx_refresh_tokens_user", "user_id"),
    )

    @property
    def is_valid(self):
        """True if not revoked and not expired."""
        return self.revoked_at is None and self.expires_at > _now()

    def __repr__(self):
        return f"<RefreshToken jti={self.jti} user={self.user_id} valid={self.is_valid}>"
