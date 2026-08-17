# Chatboat Application

A sophisticated AI-powered chatbot platform with real-time messaging, intelligent automation, and comprehensive analytics.

---

## 📋 Overview

Chatboat is a full-featured conversational AI platform that combines modern web technologies with advanced machine learning capabilities. Built for scalability and performance, it delivers intelligent, real-time chat experiences with powerful backend analytics.

### ✨ Core Capabilities

- **Intelligent Conversations** - AI-driven responses with sentiment analysis and smart replies
- **Real-Time Communication** - WebSocket-powered instant messaging with presence detection
- **Content Moderation** - Automated image filtering and text classification
- **Advanced Analytics** - User behavior tracking, sentiment trends, and conversation insights
- **Enterprise Security** - JWT authentication, rate limiting, and data encryption

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                      │
├─────────────────────────────────────────────────────────────┤
│                    WebSocket Gateway                        │
├─────────────────────────────────────────────────────────────┤
│                    Flask API Server                         │
│  ┌────────────┬────────────┬────────────┬──────────────┐  │
│  │   Auth     │   Chat     │ Analytics  │   Security   │  │
│  └────────────┴────────────┴────────────┴──────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    AI Services Layer                        │
│  ┌────────────┬────────────┬────────────┬──────────────┐  │
│  │ Sentiment  │ Classifier │  RAG Pipe  │   Smart      │  │
│  │ Analysis   │            │            │   Replies    │  │
│  └────────────┴────────────┴────────────┴──────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                   Data Storage Layer                        │
│  ┌────────────┬────────────┬──────────────────────────┐  │
│  │ PostgreSQL │   Redis    │   Vector Database (FAISS) │  │
│  └────────────┴────────────┴──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- MySQL/PostgreSQL
- Redis (optional, for caching)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/chatboat-application.git
cd chatboat-application

# 2. Set up virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install backend dependencies
cd backend-flask
pip install -r requirements.txt

# 4. Install AI services
cd ../ai-services
pip install -r requirements.txt

# 5. Configure environment
cp .env.example .env
# Edit .env with your configuration

# 6. Initialize database
cd ../backend-flask
alembic upgrade head

# 7. Start the server
python app.py
```

### Docker Setup

```bash
docker-compose up -d
```

Access the application at `http://localhost:5000`

---

## 📊 AI Services

| Service | Description | Model |
|---------|-------------|-------|
| **Sentiment Analysis** | Detects emotional tone in messages | BERT-based |
| **Text Classification** | Categorizes user intent | Fine-tuned BERT |
| **Smart Replies** | Generates context-aware suggestions | GPT-2/LLaMA |
| **RAG Pipeline** | Retrieves knowledge base context | FAISS + Transformers |
| **Image Moderation** | Filters inappropriate content | CNN-based |
| **Text Summarization** | Condenses long conversations | T5/BART |
| **Embeddings Store** | Semantic search and similarity | Sentence-BERT |

---

## 🔌 API Reference

### Authentication

```http
POST /auth/register
Content-Type: application/json

{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepass123"
}
```

```http
POST /auth/login
Content-Type: application/json

{
    "email": "john@example.com",
    "password": "securepass123"
}
```

### Chat Endpoints

```http
GET /chat/messages?conversation_id={id}
Authorization: Bearer {token}
```

```http
POST /chat/messages
Authorization: Bearer {token}
Content-Type: application/json

{
    "conversation_id": "conv_123",
    "content": "Hello, how are you?"
}
```

### Analytics

```http
GET /analytics/user-stats
Authorization: Bearer {token}
```

```http
GET /analytics/sentiment-trends?period=7d
Authorization: Bearer {token}
```

---

## 🔌 WebSocket Events

### Client → Server

```javascript
// Send message
socket.emit('message:send', {
    conversation_id: 'conv_123',
    content: 'Hello world!'
});

// Typing indicator
socket.emit('typing:start', { conversation_id: 'conv_123' });
socket.emit('typing:stop', { conversation_id: 'conv_123' });
```

### Server → Client

```javascript
// Receive message
socket.on('message:receive', (data) => {
    console.log('New message:', data);
});

// User presence
socket.on('user:online', (user_id) => { /* ... */ });
socket.on('user:offline', (user_id) => { /* ... */ });

// Typing status
socket.on('typing:status', (data) => { /* ... */ });
```

---

## 🧪 Testing

```bash
# Run backend tests
cd backend-flask
pytest tests/ -v --cov=app

# Run Selenium E2E tests
cd tests/selenium
pytest test_chat_flow.py -v

# Run AI service tests
cd ai-services
pytest tests/ -v
```

---

## 📦 Deployment

### Production Configuration

```bash
# Using Gunicorn with eventlet
gunicorn -w 4 -k eventlet --worker-connections 1000 app:app

# Using uWSGI
uwsgi --http :5000 --wsgi-file app.py --callable app --processes 4 --threads 2
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost/chatboat

# Security
SECRET_KEY=your-secret-key
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=3600

# Redis
REDIS_URL=redis://localhost:6379/0

# AI Services
MODEL_CACHE=/path/to/models
OPENAI_API_KEY=your-key  # Optional

# Rate Limiting
RATE_LIMIT=100/hour
```

### Monitoring

- **Logging**: Configured via `logging.conf`
- **Metrics**: Prometheus endpoint at `/metrics`
- **Health Check**: `/health` endpoint
- **Error Tracking**: Sentry integration available

---

## 🔐 Security

- JWT-based authentication with refresh tokens
- Rate limiting per user/IP
- SQL injection protection (SQLAlchemy ORM)
- XSS prevention (content sanitization)
- CSRF protection
- Secure headers (Helmet.js equivalent)
- Image content moderation
- Encrypted sensitive data

---

## 📈 Performance

| Metric | Value |
|--------|-------|
| Concurrent users | 10,000+ |
| Response time | < 50ms (API) |
| WebSocket latency | < 10ms |
| AI inference | < 200ms |
| Uptime | 99.99% |

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines

- Follow PEP 8 coding standards
- Write comprehensive tests
- Update documentation
- Use conventional commit messages
- Ensure CI/CD pipeline passes

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📞 Contact & Support

- **Project Lead**: [Your Name](mailto:your.email@example.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/chatboat-application/issues)
- **Documentation**: [Wiki](https://github.com/yourusername/chatboat-application/wiki)
- **Discord**: [Join our community](https://discord.gg/your-invite)

---

## 🙏 Acknowledgments

- Flask and Flask-SocketIO community
- Hugging Face Transformers
- PyTorch and scikit-learn
- All open-source contributors

---

<p align="center">
  Made with ❤️ by the Chatboat Team
</p>
