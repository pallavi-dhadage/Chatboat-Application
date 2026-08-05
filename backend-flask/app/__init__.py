"""
Flask application factory for the Chat_Service.

create_app() initialises all extensions in the correct order:
  1. Config from environment variables (12-factor)
  2. SQLAlchemy with dual-database binds (PostgreSQL + MySQL)
  3. Flask-Migrate (Alembic) against the PostgreSQL bind
  4. Flask-JWT-Extended
  5. Flask-SocketIO with Redis pub/sub adapter
  6. CORS
  7. Blueprints (REST routes, auth)
  8. Socket.IO event handlers
  9. Security headers after_request hook
"""

import os

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_socketio import SocketIO

from .models import db

# SocketIO is a module-level singleton so socket_events.py can import it directly
socketio = SocketIO(cors_allowed_origins='*')


def create_app(test_config: dict | None = None) -> Flask:
    """
    Create and configure the Flask application.

    Args:
        test_config: Optional dict of config overrides — used by the pytest
                     conftest to inject an in-memory test database.

    Returns:
        A fully configured Flask application instance.
    """
    app = Flask(__name__)

    # -------------------------------------------------------------------------
    # Configuration — all values read from environment variables (12-factor)
    # -------------------------------------------------------------------------
    app.config.update(
        # Flask core
        SECRET_KEY=os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me"),
        ENV=os.getenv("FLASK_ENV", "development"),
        JSON_SORT_KEYS=False,

        # PostgreSQL — primary database (users, conversations, messages …)
        SQLALCHEMY_DATABASE_URI=os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg2://chatuser:chatpass@localhost:5432/chatdb"
        ),

        # MySQL — secondary analytics database
        SQLALCHEMY_BINDS={
            "analytics": os.getenv(
                "MYSQL_URL",
                "mysql+pymysql://analyticsuser:analyticspass@localhost:3306/analyticsdb"
            )
        },

        # Disable SQLAlchemy event system to reduce overhead
        SQLALCHEMY_TRACK_MODIFICATIONS=False,

        # JWT configuration
        JWT_SECRET_KEY=os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-me"),
        JWT_REFRESH_SECRET_KEY=os.getenv("JWT_REFRESH_SECRET_KEY", "dev-refresh-secret"),
        JWT_ACCESS_TOKEN_EXPIRES=__import__("datetime").timedelta(
            minutes=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", "15"))
        ),
        JWT_REFRESH_TOKEN_EXPIRES=__import__("datetime").timedelta(
            days=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES_DAYS", "7"))
        ),
        JWT_TOKEN_LOCATION=["headers"],
        JWT_HEADER_NAME="Authorization",
        JWT_HEADER_TYPE="Bearer",

        # Redis URL — used by SocketIO message queue and rate limiter
        REDIS_URL=os.getenv("REDIS_URL", "redis://localhost:6379/0"),

        # AWS S3
        AWS_ACCESS_KEY_ID=os.getenv("AWS_ACCESS_KEY_ID", ""),
        AWS_SECRET_ACCESS_KEY=os.getenv("AWS_SECRET_ACCESS_KEY", ""),
        AWS_S3_BUCKET=os.getenv("AWS_S3_BUCKET", ""),
        AWS_REGION=os.getenv("AWS_REGION", "us-east-1"),
        AWS_S3_PRESIGN_TTL=int(os.getenv("AWS_S3_PRESIGN_TTL", "3600")),

        # Groq API
        GROQ_API_KEY=os.getenv("GROQ_API_KEY", ""),
        GROQ_MODEL=os.getenv("GROQ_MODEL", "llama3-70b-8192"),

        # LangSmith tracing
        LANGSMITH_API_KEY=os.getenv("LANGSMITH_API_KEY", ""),

        # Upload limits
        MAX_CONTENT_LENGTH=15 * 1024 * 1024,   # 15 MB — Nginx also limits to 15 MB
    )

    # Allow test_config to override any of the above
    if test_config:
        app.config.update(test_config)

    # -------------------------------------------------------------------------
    # SQLAlchemy — initialise with PostgreSQL + MySQL dual-bind
    # -------------------------------------------------------------------------
    db.init_app(app)

    # -------------------------------------------------------------------------
    # Flask-Migrate (Alembic) — manages PostgreSQL schema migrations
    # The 'db' object here is bound to the default (PostgreSQL) URI.
    # MySQL analytics tables are created directly via db.create_all(bind_key='analytics')
    # -------------------------------------------------------------------------
    Migrate(app, db)

    # -------------------------------------------------------------------------
    # JWT
    # -------------------------------------------------------------------------
    jwt = JWTManager(app)

    # Custom JWT error handlers for cleaner API responses
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        from flask import jsonify
        return jsonify({"error": "Token has expired"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        from flask import jsonify
        return jsonify({"error": "Invalid token"}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        from flask import jsonify
        return jsonify({"error": "Authorization token required"}), 401

    # -------------------------------------------------------------------------
    # Flask-SocketIO — Redis pub/sub adapter for multi-instance scaling
    # eventlet async_mode required by gunicorn eventlet worker
    # -------------------------------------------------------------------------
    redis_url = app.config["REDIS_URL"]
    try:
        import eventlet
        async_mode = 'eventlet'
    except Exception:
        async_mode = 'threading'

    socketio.init_app(
        app,
        cors_allowed_origins="*",
        async_mode=async_mode,
        message_queue=redis_url,   # Redis pub/sub for multi-instance fan-out
        logger=False,
        engineio_logger=False,
    )

    # -------------------------------------------------------------------------
    # CORS — allow the React SPA origin in development
    # In production, Nginx handles CORS headers; this is a fallback.
    # -------------------------------------------------------------------------
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # -------------------------------------------------------------------------
    # Register Blueprints (REST API routes)
    # -------------------------------------------------------------------------
    with app.app_context():
        from .auth import auth_bp
        from .routes import routes_bp

        app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
        app.register_blueprint(routes_bp, url_prefix="/api/v1")

        # Health check endpoints (used by Docker and Kubernetes probes and local dev checks)
        from flask import jsonify

        @app.route('/health')
        @app.route('/api/v1/health')
        def health():
            return jsonify({'status': 'ok'}), 200
        # Create analytics (MySQL) tables on first startup if they don't exist
        # PostgreSQL tables are managed by Alembic migrations
        try:
            db.create_all(bind_key="analytics")
        except Exception:
            # MySQL may not be available during testing — swallow the error
            pass

    # -------------------------------------------------------------------------
    # Socket.IO event handlers
    # -------------------------------------------------------------------------
    from .socket_events import register_socket_handlers
    register_socket_handlers(socketio)

    # -------------------------------------------------------------------------
    # Security headers — applied to every response
    # -------------------------------------------------------------------------
    from .security import apply_security_headers
    app.after_request(apply_security_headers)

    return app
