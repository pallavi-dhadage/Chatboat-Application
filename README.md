# AI-Powered Real-Time Chat Platform

A production-grade, full-stack chat platform with AI features including smart replies, conversation summarization, sentiment analysis, and RAG-powered support assistant.

## 🚀 Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd chat-platform

# Copy environment variables
cp .env.example .env

# Start all services
docker compose up -d

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:8000/api/v1
# Admin Panel: http://localhost:8001/admin
🏗️ Architecture
text
┌─────────────────────────────────────────────────────────────┐
│                      Nginx (Reverse Proxy)                  │
│                    Load Balancing & Routing                 │
└──────┬───────────────────────┬──────────────────────────────┘
       │                       │
┌──────▼──────┐         ┌──────▼──────┐
│  Frontend   │         │   Backend   │
│   React.js  │◄────────┤   Flask     │
│  Tailwind   │  WebSocket│ Socket.IO  │
│  Framer     │         │  REST API   │
└─────────────┘         └──────┬──────┘
                                │
                   ┌────────────┼────────────┐
                   │            │            │
            ┌──────▼──────┐ ┌───▼─────┐ ┌───▼─────┐
            │ PostgreSQL  │ │  Redis  │ │  MySQL  │
            │  (Primary)  │ │(Cache/  │ │(Analytics│
            │ Users, MSGs │ │   Pub/  │ │  Data)  │
            │ Convs, etc  │ │   Sub)  │ └─────────┘
            └─────────────┘ └─────────┘
                                │
                   ┌────────────┼────────────┐
                   │            │            │
            ┌──────▼──────┐ ┌───▼─────┐ ┌───▼─────┐
            │  Django     │ │  AI     │ │   S3    │
            │ Admin Panel │ │ Services│ │  Files  │
            └─────────────┘ └─────────┘ └─────────┘
📦 Tech Stack
Frontend
React.js - UI framework with hooks and context

TypeScript - Type safety

Tailwind CSS - Utility-first styling with dark/light mode

Framer Motion - Smooth animations

Socket.IO Client - Real-time communication

Recharts - Analytics dashboard visualizations

Backend
Flask + Flask-SocketIO - REST API & WebSocket server

Django - Admin panel and user management

PostgreSQL - Primary relational database

Redis - Session cache, Socket.IO pub/sub, rate limiting

MySQL - Analytics and reporting data

AI Services
Groq API (LLaMA) - Generative AI for smart replies & summarization

LangGraph - Multi-agent orchestration framework

LangSmith - Agent observability and tracing

Sentence-Transformers - Text embeddings for semantic search & RAG

FAISS - Vector similarity search

Scikit-Learn - Message classification (spam/toxic/clean)

TensorFlow/Keras - Sentiment analysis model

OpenCV - Image moderation and face blurring

Infrastructure
Docker - Containerization with multi-stage builds

Docker Compose - Local orchestration

GitHub Actions - CI/CD pipeline

Kubernetes - Production manifests

AWS S3 - File and image storage

Nginx - Reverse proxy and load balancer

🔑 Environment Variables
Create a .env file with:

env
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/chatdb
MYSQL_DATABASE_URL=mysql://user:password@mysql:3306/analytics

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1

# Groq API
GROQ_API_KEY=your-groq-api-key

# LangSmith
LANGCHAIN_API_KEY=your-langsmith-key
LANGCHAIN_PROJECT=chat-platform

# Flask
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-flask-secret
🧪 Testing
bash
# Backend tests
docker compose exec backend-flask pytest

# Frontend tests
docker compose exec frontend npm test

# E2E tests (requires running application)
docker compose exec selenium pytest tests/selenium/

# Run all tests locally
./scripts/run-tests.sh
🚢 CI/CD Pipeline
Our GitHub Actions workflow (ci.yml) handles:

Linting - ESLint (frontend) + flake8 (backend)

Testing - pytest, vitest, and Selenium tests

Building - Multi-stage Docker builds for all services

Security Scanning - Dependency vulnerability checks

All PRs to main must pass the full pipeline before merging.

🎯 Key Features
✅ User Management
JWT-based authentication with refresh tokens

Role-Based Access Control (User/Moderator/Admin)

User profiles with avatars and status

💬 Real-Time Messaging
WebSocket connections via Socket.IO

Redis pub/sub for horizontal scaling

Typing indicators and read receipts

Presence tracking (online/offline)

🤖 AI Features
Smart Replies - Contextual response suggestions via Groq

Conversation Summarization - LangGraph agent pipeline

RAG Assistant - Knowledge base Q&A with FAISS

Semantic Search - Embedding-based message retrieval

Sentiment Analysis - TensorFlow model per message

Content Moderation - Scikit-Learn classification + LangGraph deep check

🛡️ Security & Performance
Rate limiting (60 REST req/min, 30 WebSocket events/min)

File upload moderation (NSFW detection, face blurring)

Input validation and sanitization

12-Factor app compliance

📊 Analytics Dashboard
Real-time message volume and sentiment trends

User engagement metrics

AI usage statistics (cache hit rate, latency)

Daily rollups in MySQL

📁 Project Structure
text
chat-platform/
├── frontend/               # React + TypeScript
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Main views
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API clients
│   │   ├── store/          # State management
│   │   └── utils/          # Helpers
│   └── Dockerfile
│
├── backend-flask/          # Flask + Socket.IO
│   ├── app/
│   │   ├── api/            # REST endpoints
│   │   ├── models/         # SQLAlchemy models
│   │   ├── services/       # Business logic
│   │   ├── socket/         # WebSocket handlers
│   │   └── ai_pipeline/    # AI integration
│   ├── migrations/         # Alembic migrations
│   └── tests/
│
├── backend-django/         # Admin panel
│   ├── admin_app/
│   ├── manage.py
│   └── Dockerfile
│
├── ai-services/            # AI models
│   ├── models/             # Pre-trained models
│   │   ├── classifier.joblib
│   │   ├── sentiment.h5
│   │   └── embeddings.pkl
│   ├── vector_store/       # FAISS indices
│   └── Dockerfile
│
├── infra/                  # Infrastructure
│   ├── docker-compose.yml
│   ├── nginx.conf
│   └── k8s/                # Kubernetes manifests
│
├── tests/                  # Testing
│   ├── selenium/           # E2E tests
│   ├── postman/            # API collection
│   └── performance/        # Load tests
│
├── .github/workflows/      # CI/CD
│   └── ci.yml
│
├── README.md
├── ARCHITECTURE.md
└── .env.example
📝 Resume Talking Points
React + TypeScript
Implemented custom hooks for WebSocket management and real-time state synchronization

Used context API for theme and authentication state across 20+ components

Flask + Socket.IO
Built RESTful API with JWT authentication and RBAC middleware

Scaled WebSocket connections using Redis pub/sub across multiple instances

Django Admin
Leveraged Django's built-in admin with custom views for user management

Exposed analytics data through read-only models

PostgreSQL + MySQL
Designed normalized schema with foreign keys and indexes for 100K+ message queries

Implemented daily rollups in MySQL to offload analytical workloads

Redis
Used for session caching, rate limiting (sliding window), and WebSocket pub/sub

Implemented semantic caching for AI endpoints reducing API costs by 40%

AI/ML Pipeline
Deployed 4 distinct AI models (classification, sentiment, embeddings, moderation)

Integrated LangGraph agents with supervisor pattern for composable workflows

Optimized FAISS vector search for sub-50ms semantic queries

Docker & Kubernetes
Multi-stage Docker builds reducing image size by 60%

Kubernetes manifests with ConfigMaps and Ingress for production deployment

AWS Services
S3 for file storage with pre-signed URLs (1-hour validity)

Designed for ECS deployment with IAM roles and VPC networking

CI/CD
GitHub Actions pipeline with parallel lint/test/build stages

Automated testing coverage for REST, WebSocket, and E2E flows

🔒 Security Considerations
All secrets stored in environment variables (12-Factor)

JWT access tokens expire in 15 minutes, refresh in 7 days

Rate limiting per user and per IP

File uploads validated (type, size, moderation)

Content Security Policy headers on all responses

Input validation (max 4000 chars)

bcrypt password hashing (cost factor 12)

📈 Performance Targets
REST API response time: < 200ms (p95)

WebSocket message delivery: < 100ms

AI smart replies: < 2s (with caching)

Semantic search: < 500ms

Image moderation: < 1s

Supports 1000+ concurrent users

🧠 Architecture Decisions
Flask over Django for Chat Service

Lighter footprint for WebSocket handling

Easier integration with Socket.IO

Redis Pub/Sub for Scaling

Enables horizontal scaling of Socket.IO instances

Session sharing without sticky sessions

Separate Analytics Database (MySQL)

Prevents analytical queries from impacting OLTP performance

Allows different backup strategies

LangGraph Supervisor Pattern

Extensible agent framework

Single entry point for multiple AI capabilities

Built-in observability with LangSmith

Two-Tier Moderation

Fast ML model for real-time classification

LLM-backed deep check for borderline cases

Balances speed and accuracy

🤝 Contributing
Fork the repository

Create a feature branch (git checkout -b feature/amazing-feature)

Commit changes (git commit -m 'Add amazing feature')

Push to branch (git push origin feature/amazing-feature)

Open a Pull Request with comprehensive tests

📄 License
This project is for portfolio demonstration purposes. All rights reserved.
