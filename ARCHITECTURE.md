# Architecture Document — AI-Powered Real-Time Chat Platform

This document describes the three core user journeys through the system, with
sequence diagrams and component interactions.

---

## System Overview

```
Browser ──HTTP/WS──► Nginx ──► Flask Chat_Service (port 5000)
                    │       └──► ai-services (in-process)
                    └──────► Django Admin_Service (port 8000)

Flask ──SQLAlchemy──► PostgreSQL (primary DB)
Flask ──redis-py────► Redis (pub/sub, cache, presence, rate limit)
Flask ──boto3───────► AWS S3 (files, avatars)
Flask ──SQLAlchemy──► MySQL (analytics rollup)
ai-services ─────────► Groq API (LLM inference)
ai-services ─────────► LangSmith (observability)
ai-services (FAISS) ─► in-process vector search
```

---

## Data Flow 1: Sending a Real-Time Message

```
Client              Socket_Gateway      Classifier       PostgreSQL    FAISS         Redis           Sentiment_Model
  │                       │                 │                │             │              │                  │
  │  emit send_message     │                │                │             │              │                  │
  │───────────────────────►│                │                │             │              │                  │
  │                        │  validate JWT  │                │             │              │                  │
  │                        │◄──────────────(JWT store)       │             │              │                  │
  │                        │                │                │             │              │                  │
  │                        │  classify(text)│                │             │              │                  │
  │                        │───────────────►│                │             │              │                  │
  │                        │◄─(label, conf) │                │             │              │                  │
  │                        │                │                │             │              │                  │
  │         [borderline: 0.4 ≤ conf ≤ 0.6] ──► LangGraph Moderation_Agent ──► Groq ──► final label        │
  │                        │                │                │             │              │                  │
  │           [flagged: label=spam|toxic]   │                │             │              │                  │
  │                        │  INSERT message(flagged=true)   │             │              │                  │
  │                        │────────────────────────────────►│             │              │                  │
  │                        │  emit message_flagged ──────────────────────────────────────► moderator rooms  │
  │                        │                │                │             │              │                  │
  │           [clean: label=clean]          │                │             │              │                  │
  │                        │  INSERT message(flagged=false)  │             │              │                  │
  │                        │────────────────────────────────►│             │              │                  │
  │                        │  add_embedding(message_id, text)│             │              │                  │
  │                        │─────────────────────────────────────────────►│              │                  │
  │                        │  publish new_message to room ───────────────────────────────►│                 │
  │                        │                │                │             │              │                  │
  │  broadcast new_message │                │                │             │              │                  │
  │◄───────────────────────│                │                │             │              │                  │
  │  (all room participants)│               │                │             │              │                  │
  │                        │  predict(text) │                │             │              │                  │
  │                        │────────────────────────────────────────────────────────────────────────────────►│
  │                        │  UPDATE message(sentiment_label, sentiment_score)                               │
  │                        │────────────────────────────────►│             │              │                  │
```

Key design decisions:
- Message is persisted to PostgreSQL **before** being broadcast — guarantees history even if clients disconnect during delivery.
- Classifier runs synchronously before persist; sentiment model runs after broadcast to avoid adding latency to delivery.
- Redis pub/sub fan-out enables multiple Flask instances to participate in the same Socket.IO rooms.
- Borderline messages (confidence 0.4–0.6) are escalated to the LangGraph Moderation_Agent for a deeper Groq-powered check.

---

## Data Flow 2: Invoking the AI Support Assistant (RAG)

```
Client              Flask              LangGraph          RAG_Pipeline    FAISS KB        Groq API        LangSmith
  │                   │                 Supervisor             │              │                │                │
  │  POST /ai/assistant {query}         │                      │              │                │                │
  │───────────────────►│                │                      │              │                │                │
  │                    │  invoke(query) │                      │              │                │                │
  │                    │───────────────►│                      │              │                │                │
  │                    │                │  route: task=assist  │              │                │                │
  │                    │                │─────────────────────►│              │                │                │
  │                    │                │                      │  embed(query)│                │                │
  │                    │                │                      │─────────────►│                │                │
  │                    │                │                      │◄─top-5 docs  │                │                │
  │                    │                │                      │              │                │                │
  │                    │        [max_score < 0.5]              │              │                │                │
  │                    │◄────── "No relevant information found" ──────────────│                │                │
  │                    │                │                      │              │                │                │
  │                    │        [max_score ≥ 0.5]              │              │                │                │
  │                    │                │                      │  generate(context+query)       │                │
  │                    │                │                      │───────────────────────────────►│                │
  │                    │                │                      │◄─ grounded_answer ─────────────│                │
  │                    │                │◄─ {answer, sources}  │              │                │                │
  │                    │◄─ final_answer │                      │              │                │                │
  │                    │                │  emit_trace(hits, tokens, latency)                   │                │
  │                    │                │────────────────────────────────────────────────────────────────────►│
  │◄─ {answer, sources}│                │                      │              │                │                │
```

Key design decisions:
- FAISS is loaded in-process — no network hop, sub-100ms retrieval.
- Similarity threshold (0.5) prevents the LLM from hallucinating answers when the knowledge base has no relevant content.
- LangGraph wraps the RAG pipeline as a tool so the Supervisor can compose it with other agents.
- LangSmith captures retrieval hit count, source titles, and final token usage for every query.

---

## Data Flow 3: Uploading an Image with Moderation

```
Client              Flask (routes.py)   Image_Moderator (OpenCV)    AWS S3
  │                       │                       │                     │
  │  POST /messages/upload (multipart)            │                     │
  │──────────────────────►│                       │                     │
  │                        │  validate content-type (allowlist)         │
  │                        │  check file size ≤ 10 MB                   │
  │                        │  [type not in allowlist] ─► 415            │
  │                        │  [size > 10 MB]           ─► 413           │
  │                        │                       │                     │
  │                        │  analyze(image_bytes) │                     │
  │                        │──────────────────────►│                     │
  │                        │                       │  convert to HSV     │
  │                        │                       │  compute skin ratio │
  │                        │                       │                     │
  │                        │  [nsfw=true]          │                     │
  │◄────── 422 Rejected ───│◄──────────────────────│                     │
  │                        │                       │                     │
  │                        │  [nsfw=false]         │                     │
  │                        │                       │  detect faces (Haar)│
  │                        │                       │  blur face regions  │
  │                        │◄──{processed_image}───│                     │
  │                        │                       │                     │
  │                        │  put_object(key, processed_image)           │
  │                        │─────────────────────────────────────────────►
  │                        │  generate_presigned_url(TTL=3600s)          │
  │                        │◄─── presigned_url ──────────────────────────│
  │◄─── {url: presigned_url} │                     │                     │
```

Key design decisions:
- Image_Moderator runs **before** any S3 write — no NSFW content ever reaches storage.
- Face blurring is applied to the processed image; the original bytes are never stored.
- S3 URLs are presigned with a 1-hour TTL; the S3 bucket is private (no public ACL).
- The allowlist approach (JPEG/PNG/GIF/PDF/text) reduces attack surface compared to trying to detect and block specific formats.

---

## Component Responsibilities Summary

| Component          | Responsibility                                                    |
|--------------------|-------------------------------------------------------------------|
| Nginx              | TLS termination, request routing, WebSocket upgrade headers       |
| Flask Chat_Service | REST API, Socket.IO events, JWT auth, RBAC, rate limiting         |
| Django Admin       | User management admin panel (shared PostgreSQL, managed=False)    |
| ai-services        | All ML/AI model code (classifier, sentiment, RAG, LangGraph, etc.)|
| PostgreSQL         | Users, conversations, messages, notifications, refresh tokens     |
| MySQL              | Analytics daily rollup, AI usage stats                            |
| Redis              | Socket.IO pub/sub, rate limit counters, presence, smart reply cache|
| AWS S3             | File and avatar storage (presigned URLs, private bucket)          |
| Groq API           | LLM inference (smart replies, summarization, moderation, RAG)     |
| LangSmith          | Observability and tracing for LangGraph agent executions          |
| FAISS              | In-process vector similarity search (KB index + message index)    |
