"""
SQLAlchemy ORM models for the analytics MySQL database.

These models use the 'analytics' bind key defined in SQLALCHEMY_BINDS.
They map to the secondary MySQL store that holds aggregated analytics data,
keeping expensive OLAP queries off the primary PostgreSQL OLTP database.
"""

from datetime import date as date_type, datetime, timezone

from .models import db


def _now():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# AnalyticsDailyRollup
# ---------------------------------------------------------------------------

class AnalyticsDailyRollup(db.Model):
    """
    Daily aggregate metrics written by the Analytics_Engine.

    Each row captures one metric value for one day, using a key-value
    structure so new metric types can be added without schema changes.

    Examples of metric_name values:
        message_volume, active_users, flagged_message_count,
        sentiment_positive_ratio, avg_response_time_ms
    """
    __bind_key__ = "analytics"
    __tablename__ = "analytics_daily_rollup"

    id           = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    date         = db.Column(db.Date, nullable=False)
    metric_name  = db.Column(db.String(100), nullable=False)
    metric_value = db.Column(db.Float, nullable=False)
    created_at   = db.Column(db.DateTime, nullable=False, default=_now)

    __table_args__ = (
        # Enforce one row per (date, metric_name) — upsert logic uses this
        db.UniqueConstraint("date", "metric_name", name="uq_daily_metric"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    def to_dict(self):
        return {
            "id":           self.id,
            "date":         self.date.isoformat() if self.date else None,
            "metric_name":  self.metric_name,
            "metric_value": self.metric_value,
        }

    def __repr__(self):
        return f"<AnalyticsDailyRollup {self.date} {self.metric_name}={self.metric_value}>"


# ---------------------------------------------------------------------------
# AIUsageStats
# ---------------------------------------------------------------------------

class AIUsageStats(db.Model):
    """
    Daily AI endpoint usage statistics written by the Chat_Service.

    Tracks request volume, cache hit rate, and average latency per AI endpoint
    so the analytics dashboard can show AI feature usage trends.

    Endpoint values:
        /api/v1/ai/smart-replies, /api/v1/ai/summarize,
        /api/v1/ai/assistant, /api/v1/ai/search
    """
    __bind_key__ = "analytics"
    __tablename__ = "ai_usage_stats"

    id             = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    date           = db.Column(db.Date, nullable=False)
    endpoint       = db.Column(db.String(100), nullable=False)
    request_count  = db.Column(db.Integer, nullable=False, default=0)
    cache_hits     = db.Column(db.Integer, nullable=False, default=0)
    avg_latency_ms = db.Column(db.Float, nullable=False, default=0.0)

    __table_args__ = (
        db.UniqueConstraint("date", "endpoint", name="uq_daily_endpoint"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    @property
    def cache_hit_rate(self):
        """Return cache hit ratio as a float between 0.0 and 1.0."""
        if self.request_count == 0:
            return 0.0
        return self.cache_hits / self.request_count

    def to_dict(self):
        return {
            "id":             self.id,
            "date":           self.date.isoformat() if self.date else None,
            "endpoint":       self.endpoint,
            "request_count":  self.request_count,
            "cache_hits":     self.cache_hits,
            "cache_hit_rate": round(self.cache_hit_rate, 4),
            "avg_latency_ms": self.avg_latency_ms,
        }

    def __repr__(self):
        return f"<AIUsageStats {self.date} {self.endpoint} reqs={self.request_count}>"
