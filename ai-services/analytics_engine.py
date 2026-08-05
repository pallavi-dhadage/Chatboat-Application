"""
Analytics Engine — Pandas/NumPy data aggregation.

Reads message and user data from PostgreSQL, computes platform metrics,
and writes daily rollup records to MySQL.

compute_metrics() -> dict
    Returns aggregated metrics for the analytics dashboard.
"""

import logging
import os
from datetime import date, datetime, timedelta, timezone

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

_PG_URL    = os.environ.get("DATABASE_URL", "")
_MYSQL_URL = os.environ.get("MYSQL_URL", "")


def _pg_engine():
    if not _PG_URL:
        return None
    try:
        return create_engine(_PG_URL, pool_pre_ping=True)
    except Exception as e:
        logger.error("Failed to create PostgreSQL engine: %s", e)
        return None


def _mysql_engine():
    if not _MYSQL_URL:
        return None
    try:
        return create_engine(_MYSQL_URL, pool_pre_ping=True)
    except Exception as e:
        logger.error("Failed to create MySQL engine: %s", e)
        return None


def compute_metrics() -> dict:
    """
    Compute platform analytics metrics using Pandas/NumPy.

    Reads from PostgreSQL:
        - messages table (volume, sentiment, flagged count, response time)
        - users table (active users)

    Writes daily rollup to MySQL.

    Returns:
        {
            message_volume:       int,
            active_users:         int,
            sentiment_trend:      list[{date, positive, neutral, negative}],
            response_time_ms:     float,
            flagged_message_count: int,
        }
    """
    pg = _pg_engine()

    if pg is None:
        return _empty_metrics()

    try:
        # Load messages from last 30 days
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        messages_df = pd.read_sql(
            text(
                "SELECT id, conversation_id, sender_id, text, "
                "sentiment_label, flagged, created_at "
                "FROM messages "
                "WHERE deleted_at IS NULL AND created_at >= :cutoff "
                "ORDER BY created_at ASC"
            ),
            pg,
            params={"cutoff": cutoff},
            parse_dates=["created_at"],
        )

        if messages_df.empty:
            return _empty_metrics()

        # --- Message volume ---
        message_volume = len(messages_df)

        # --- Active users (distinct senders in last 24 hours) ---
        cutoff_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        active_users = int(
            messages_df[messages_df["created_at"] >= cutoff_24h]["sender_id"]
            .nunique()
        )

        # --- Flagged message count ---
        flagged_count = int(messages_df["flagged"].sum())

        # --- Sentiment trend (daily ratios) ---
        sentiment_trend = _compute_sentiment_trend(messages_df)

        # --- Average response time ---
        response_time_ms = _compute_avg_response_time(messages_df)

        metrics = {
            "message_volume":       message_volume,
            "active_users":         active_users,
            "sentiment_trend":      sentiment_trend,
            "response_time_ms":     round(response_time_ms, 1),
            "flagged_message_count": flagged_count,
        }

        # Write daily rollup to MySQL
        _write_daily_rollup(metrics)

        return metrics

    except Exception as e:
        logger.error("Analytics computation failed: %s", e)
        return _empty_metrics()


def _compute_sentiment_trend(df: pd.DataFrame) -> list[dict]:
    """Compute daily sentiment distribution as a time-series array."""
    if "sentiment_label" not in df.columns or df["sentiment_label"].isna().all():
        return []

    df_copy = df.copy()
    df_copy["date"] = df_copy["created_at"].dt.date

    # Count per day per label
    daily = (
        df_copy.groupby(["date", "sentiment_label"])
        .size()
        .unstack(fill_value=0)
    )

    # Ensure all three labels are present
    for label in ("positive", "neutral", "negative"):
        if label not in daily.columns:
            daily[label] = 0

    # Compute ratios
    daily["total"] = daily[["positive", "neutral", "negative"]].sum(axis=1)
    result = []
    for d, row in daily.iterrows():
        total = row["total"] or 1
        result.append({
            "date":     str(d),
            "positive": round(row["positive"] / total, 4),
            "neutral":  round(row["neutral"]  / total, 4),
            "negative": round(row["negative"] / total, 4),
        })
    return result


def _compute_avg_response_time(df: pd.DataFrame) -> float:
    """
    Compute average time between consecutive messages in a conversation.
    Approximates user response time in milliseconds.
    """
    if len(df) < 2:
        return 0.0

    diffs = []
    for _, group in df.groupby("conversation_id"):
        group_sorted = group.sort_values("created_at")
        td = group_sorted["created_at"].diff().dropna()
        # Only count gaps < 1 hour (ignore long idle periods)
        valid = td[td < pd.Timedelta(hours=1)]
        diffs.extend(valid.dt.total_seconds().tolist())

    if not diffs:
        return 0.0

    return float(np.mean(diffs)) * 1000  # convert to ms


def _write_daily_rollup(metrics: dict):
    """Write aggregated daily metrics to MySQL analytics_daily_rollup table."""
    mysql = _mysql_engine()
    if mysql is None:
        return

    today = date.today()
    rows  = [
        (today, "message_volume",       float(metrics.get("message_volume", 0))),
        (today, "active_users",         float(metrics.get("active_users", 0))),
        (today, "flagged_message_count", float(metrics.get("flagged_message_count", 0))),
        (today, "response_time_ms",     float(metrics.get("response_time_ms", 0))),
    ]

    # Add sentiment ratios from the last entry in sentiment_trend
    trend = metrics.get("sentiment_trend", [])
    if trend:
        last = trend[-1]
        rows += [
            (today, "sentiment_positive", last.get("positive", 0.0)),
            (today, "sentiment_neutral",  last.get("neutral", 0.0)),
            (today, "sentiment_negative", last.get("negative", 0.0)),
        ]

    try:
        with mysql.begin() as conn:
            for row_date, name, value in rows:
                conn.execute(text(
                    "INSERT INTO analytics_daily_rollup (date, metric_name, metric_value) "
                    "VALUES (:date, :name, :value) "
                    "ON DUPLICATE KEY UPDATE metric_value = :value"
                ), {"date": row_date, "name": name, "value": value})
    except Exception as e:
        logger.error("Failed to write daily rollup to MySQL: %s", e)


def _empty_metrics() -> dict:
    return {
        "message_volume":        0,
        "active_users":          0,
        "sentiment_trend":       [],
        "response_time_ms":      0.0,
        "flagged_message_count": 0,
    }
