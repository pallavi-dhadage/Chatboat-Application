#!/bin/sh
# =============================================================================
# backend-flask entrypoint
# Waits for PostgreSQL to be ready, runs Alembic migrations,
# then starts the gunicorn server with eventlet worker.
# =============================================================================

set -e

echo "[entrypoint] Waiting for PostgreSQL to be ready..."

# Simple TCP wait loop — avoids dependency on pg_isready binary
MAX_TRIES=30
TRIES=0
until python -c "
import os, psycopg2, sys
try:
    url = os.environ.get('DATABASE_URL', '')
    # Parse minimal connection from URL
    import re
    m = re.match(r'postgresql\+psycopg2://([^:]+):([^@]+)@([^:/]+):?(\d*)/(.+)', url)
    if not m:
        sys.exit(1)
    conn = psycopg2.connect(
        dbname=m.group(5), user=m.group(1), password=m.group(2),
        host=m.group(3), port=int(m.group(4) or 5432), connect_timeout=3
    )
    conn.close()
    sys.exit(0)
except Exception as e:
    sys.exit(1)
" 2>/dev/null; do
    TRIES=$((TRIES + 1))
    if [ "$TRIES" -ge "$MAX_TRIES" ]; then
        echo "[entrypoint] PostgreSQL not ready after ${MAX_TRIES} attempts — exiting."
        exit 1
    fi
    echo "[entrypoint] PostgreSQL not ready yet (attempt ${TRIES}/${MAX_TRIES}). Retrying in 2s..."
    sleep 2
done

echo "[entrypoint] PostgreSQL is ready."

# Run Alembic migrations
echo "[entrypoint] Running database migrations..."
flask db upgrade
echo "[entrypoint] Migrations complete."

# Start gunicorn with eventlet worker (required for Flask-SocketIO)
echo "[entrypoint] Starting gunicorn..."
exec gunicorn \
    --worker-class eventlet \
    --workers 1 \
    --bind 0.0.0.0:5000 \
    --timeout 120 \
    --keep-alive 5 \
    --log-level info \
    --access-logfile - \
    --error-logfile - \
    "app:create_app()"
