# Requirements Document

## Introduction

This document specifies requirements for a production-grade, AI-Powered Real-Time Chat Platform — a full-stack portfolio capstone project. The system is a cohesive, working product that integrates real-time messaging, multi-model AI features, RBAC-secured REST and WebSocket APIs, multi-database persistence, a data-driven analytics dashboard, and a complete DevOps pipeline. It is designed to serve as a portfolio walkthrough for software engineering interviews and to demonstrate end-to-end system design skills.

The platform is built on a monorepo layout (`/frontend`, `/backend-flask`, `/backend-django`, `/ai-services`, `/infra`, `/tests`, `/.github/workflows`) and is operable with a single `docker compose up` command.

---

## Glossary

- **System**: The AI-Powered Real-Time Chat Platform as a whole.
- **Frontend**: The React.js single-page application that provides the user interface.
- **Chat_Service**: The Flask + Flask-SocketIO backend responsible for real-time messaging, REST API endpoints, and AI orchestration.
- **Auth_Service**: The JWT-based authentication and authorization subsystem within the Chat_Service.
- **Admin_Service**: The Django application responsible for user-management views and the Django admin panel.
- **AI_Pipeline**: The ai-services layer containing the RAG pipeline, LangGraph agents, ML classifiers, and sentiment model.
- **Socket_Gateway**: The Socket.IO transport layer (server side) that handles WebSocket connections and pub/sub via Redis.
- **Nginx**: The reverse-proxy and load-balancer that routes HTTP and WebSocket traffic to upstream services.
- **PostgreSQL**: The primary relational database storing users, conversations, messages, and roles.
- **Redis**: The in-memory data store used for session cache, Socket.IO pub/sub adapter, rate limiting, and presence tracking.
- **MySQL**: The secondary relational database storing analytics and reporting tables.
- **S3**: AWS Simple Storage Service used for file and image storage.
- **Groq_Client**: The API client that communicates with the Groq API (LLaMA models) for generative AI tasks.
- **RAG_Pipeline**: The Retrieval-Augmented Generation subsystem using Sentence-Transformers embeddings and FAISS vector store.
- **LangGraph_Agent**: The multi-agent orchestration graph built with LangGraph, composed of a Supervisor, Summarizer_Agent, and Moderation_Agent.
- **LangSmith**: The observability and tracing backend for LangGraph_Agent executions.
- **Classifier**: The Scikit-Learn trained model that classifies messages as spam, toxic, or clean.
- **Sentiment_Model**: The TensorFlow/Keras model that assigns a sentiment label (positive, neutral, negative) to each message.
- **Image_Moderator**: The OpenCV-based image processing module that analyzes uploaded images for NSFW content and blurs detected faces.
- **Analytics_Engine**: The Pandas/NumPy backend module that aggregates message, sentiment, and user data into dashboard metrics.
- **User**: A registered, authenticated individual using the Platform.
- **Moderator**: A User with elevated privileges to review and act on flagged content.
- **Admin**: A User with full system privileges, including user management.
- **Conversation**: A named chat thread, either a 1:1 direct message or a named group channel.
- **Message**: A single unit of text or file content sent by a User within a Conversation.
- **JWT**: JSON Web Token — a signed token used for stateless authentication.
- **RBAC**: Role-Based Access Control — access decisions based on assigned User roles.
- **CI/CD**: Continuous Integration and Continuous Delivery pipeline implemented via GitHub Actions.
- **12-Factor**: The twelve-factor app methodology for building portable, scalable software-as-a-service applications.

---

## Requirements

### Requirement 1: User Registration and Authentication

**User Story:** As a new visitor, I want to register an account and log in securely, so that I can access the chat platform with a verified identity.

#### Acceptance Criteria

1. THE Auth_Service SHALL expose a `POST /api/v1/auth/register` endpoint that accepts a unique email address, a display name, and a password, and creates a new User record in PostgreSQL.
2. WHEN a registration request is received with a duplicate email, THE Auth_Service SHALL return HTTP 409 with an error message indicating the email is already in use.
3. WHEN a registration request is received, THE Auth_Service SHALL hash the password using bcrypt with a minimum cost factor of 12 before storing it.
4. THE Auth_Service SHALL expose a `POST /api/v1/auth/login` endpoint that accepts an email and password, validates the credentials against the PostgreSQL user store, and returns a signed JWT access token and a signed JWT refresh token upon success.
5. WHEN login credentials are invalid, THE Auth_Service SHALL return HTTP 401 with a generic error message that does not reveal whether the email or the password was incorrect.
6. THE Auth_Service SHALL issue access tokens with a maximum expiry of 15 minutes and refresh tokens with a maximum expiry of 7 days.
7. THE Auth_Service SHALL expose a `POST /api/v1/auth/refresh` endpoint that accepts a valid refresh token and returns a new access token.
8. WHEN a refresh token has expired or been revoked, THE Auth_Service SHALL return HTTP 401.
9. THE Auth_Service SHALL expose a `POST /api/v1/auth/logout` endpoint that invalidates the caller's refresh token by recording it in the Redis revocation store.
10. WHEN a WebSocket connection handshake is received, THE Socket_Gateway SHALL validate the JWT access token supplied in the connection query parameter before completing the handshake, and SHALL reject the connection with error code 4001 if the token is absent or invalid.

---

### Requirement 2: Role-Based Access Control

**User Story:** As a platform operator, I want Users to be assigned roles, so that moderators and admins can perform privileged actions that regular users cannot.

#### Acceptance Criteria

1. THE System SHALL support exactly three roles: `user`, `moderator`, and `admin`.
2. WHEN a User makes a REST API request, THE Auth_Service SHALL extract the role claim from the JWT and enforce the access policy for that endpoint before executing any business logic.
3. WHILE a User has the `user` role, THE Auth_Service SHALL permit read and write access only to Conversations the User is a participant in.
4. WHILE a User has the `moderator` role, THE Auth_Service SHALL permit all `user`-role actions plus the ability to view flagged messages, dismiss flags, and remove Messages.
5. WHILE a User has the `admin` role, THE Auth_Service SHALL permit all `moderator`-role actions plus the ability to create and deactivate User accounts, assign roles, and access the Admin_Service.
6. IF a User attempts an action that exceeds their role, THEN THE Auth_Service SHALL return HTTP 403 with a message identifying the required role.

---

### Requirement 3: Real-Time Messaging

**User Story:** As a User, I want to send and receive messages instantly within a Conversation, so that I can communicate with others in real time.

#### Acceptance Criteria

1. WHEN a User emits a `send_message` Socket.IO event with a valid `conversation_id` and non-empty `text`, THE Socket_Gateway SHALL broadcast a `new_message` event containing the persisted Message to all other participants in that Conversation room.
2. THE Socket_Gateway SHALL use the Redis pub/sub adapter so that messages sent to a room on one Chat_Service instance are delivered to participants connected to other instances.
3. WHEN a User emits a `typing` event with a `conversation_id`, THE Socket_Gateway SHALL broadcast a `typing_indicator` event to all other participants in that room within 200 ms.
4. WHEN a participant opens a Conversation, THE Socket_Gateway SHALL emit a `read_receipt` event to all other participants indicating the timestamp at which the Conversation was read.
5. WHEN a User connects to the Socket_Gateway with a valid token, THE Socket_Gateway SHALL publish that User's presence status as `online` to the Redis presence key for that User.
6. WHEN a User disconnects from the Socket_Gateway, THE Socket_Gateway SHALL update that User's Redis presence key to `offline` and broadcast a `presence_update` event to all Conversations the User participates in.
7. WHILE a User is online, THE Socket_Gateway SHALL respond to a `get_presence` event with the current online/offline status of all requested User IDs by reading from the Redis presence store.

---

### Requirement 4: Conversation and Message Management

**User Story:** As a User, I want to create conversations, view message history, and manage my conversations, so that I can have organized and persistent communication threads.

#### Acceptance Criteria

1. THE Chat_Service SHALL expose a `POST /api/v1/conversations` endpoint that accepts a conversation name and a list of participant User IDs and creates a Conversation record in PostgreSQL.
2. THE Chat_Service SHALL expose a `GET /api/v1/conversations` endpoint that returns the list of Conversations the authenticated User participates in.
3. THE Chat_Service SHALL expose a `GET /api/v1/conversations/{conversation_id}/messages` endpoint that returns a paginated list of Messages for that Conversation, accepting `page` and `page_size` query parameters.
4. WHEN a `GET /api/v1/conversations/{conversation_id}/messages` request is received without pagination parameters, THE Chat_Service SHALL default to returning the 50 most recent Messages ordered by timestamp descending.
5. THE Chat_Service SHALL expose a `DELETE /api/v1/messages/{message_id}` endpoint that is accessible only to the Message sender, a Moderator, or an Admin, and that soft-deletes the Message by setting a `deleted_at` timestamp in PostgreSQL.
6. WHEN a Message is soft-deleted, THE Socket_Gateway SHALL broadcast a `message_deleted` event to all participants in that Conversation containing the `message_id`.
7. WHEN a `send_message` event is processed, THE Chat_Service SHALL persist the Message to PostgreSQL before broadcasting the `new_message` event, so that message history is guaranteed regardless of client reconnection.

---

### Requirement 5: File and Image Sharing

**User Story:** As a User, I want to share files and images in a Conversation, so that I can exchange media alongside text messages.

#### Acceptance Criteria

1. THE Chat_Service SHALL expose a `POST /api/v1/messages/upload` endpoint that accepts a multipart file payload, validates the content type against an allowlist (JPEG, PNG, GIF, PDF, plain text), and rejects disallowed types with HTTP 415.
2. WHEN a valid file is uploaded, THE Chat_Service SHALL store the file in S3 under a path scoped to the User ID and a UUID, and SHALL return the S3 URL in the response.
3. WHEN an uploaded file has an image content type, THE Image_Moderator SHALL analyze the image for NSFW content using OpenCV before the upload completes.
4. IF the Image_Moderator determines an image exceeds the NSFW threshold, THEN THE Chat_Service SHALL reject the upload with HTTP 422 and SHALL NOT store the file in S3.
5. WHEN an uploaded image contains a detectable human face, THE Image_Moderator SHALL apply a blur mask over the face region before storing the processed image in S3.
6. THE Chat_Service SHALL enforce a maximum upload file size of 10 MB per file, returning HTTP 413 for files that exceed this limit.

---

### Requirement 6: AI Smart Reply Suggestions

**User Story:** As a User, I want the system to suggest contextual quick replies after receiving a message, so that I can respond faster without typing.

#### Acceptance Criteria

1. WHEN a `new_message` event is processed, THE AI_Pipeline SHALL call the Groq_Client with the last 5 Messages in the Conversation as context and the incoming Message text as the prompt to generate 2–3 contextual reply suggestions.
2. THE Chat_Service SHALL expose a `POST /api/v1/ai/smart-replies` endpoint that accepts a `text` field and returns an array of 2–3 reply suggestion strings from the Groq_Client.
3. WHEN an identical `text` input has been requested within the past 60 seconds, THE AI_Pipeline SHALL return the cached suggestion array from Redis without calling the Groq_Client (semantic caching).
4. WHEN the Groq_Client returns an error or times out after 5 seconds, THE AI_Pipeline SHALL return a fallback array of 3 generic reply suggestions and SHALL log the failure to LangSmith.
5. THE Chat_Service SHALL track smart-reply usage events (request count, cache hit rate) and expose these via the `GET /api/v1/analytics` endpoint.

---

### Requirement 7: AI Conversation Summarization

**User Story:** As a User, I want to generate a summary of a Conversation with one click, so that I can quickly catch up on a long thread without reading every message.

#### Acceptance Criteria

1. THE Chat_Service SHALL expose a `POST /api/v1/ai/summarize` endpoint that accepts a `conversation_id` and invokes the LangGraph_Agent Summarizer_Agent node with the full Message history for that Conversation.
2. WHEN the LangGraph_Agent completes summarization, THE Chat_Service SHALL return a summary string of no more than 250 words in the response body.
3. THE LangGraph_Agent SHALL be structured as a Supervisor node that routes the summarization task to the Summarizer_Agent node and the moderation check to the Moderation_Agent node before returning the final result.
4. THE LangGraph_Agent SHALL emit a trace to LangSmith for every summarization request, including input message count, token usage, and latency.
5. WHEN the LangGraph_Agent invocation fails or exceeds a 30-second timeout, THE Chat_Service SHALL return HTTP 503 with an error message instructing the User to try again.

---

### Requirement 8: Message Classification and Moderation

**User Story:** As a Moderator, I want the system to automatically classify messages before delivery and flag harmful content, so that the platform remains safe without requiring manual review of every message.

#### Acceptance Criteria

1. WHEN a `send_message` event is received, THE Chat_Service SHALL invoke the Classifier on the message text before persisting or broadcasting the Message.
2. THE Classifier SHALL classify each message as exactly one of: `clean`, `spam`, or `toxic`.
3. IF the Classifier labels a message as `spam` or `toxic`, THEN THE Chat_Service SHALL persist the Message with a `flagged` status and SHALL NOT broadcast it to other participants.
4. WHEN a Message is flagged, THE Chat_Service SHALL emit a `message_flagged` Socket.IO event to all connected Moderator and Admin sessions, including the `message_id`, the sender's User ID, and the classification label.
5. THE Chat_Service SHALL expose a `GET /api/v1/moderation/flagged` endpoint, restricted to Moderators and Admins, that returns a paginated list of flagged Messages.
6. THE Chat_Service SHALL expose a `POST /api/v1/moderation/messages/{message_id}/dismiss` endpoint, restricted to Moderators and Admins, that clears the `flagged` status and broadcasts the Message to Conversation participants.
7. THE Classifier SHALL be a persisted Scikit-Learn model (`.joblib` file) loaded at Chat_Service startup, not re-trained on every request.
8. THE LangGraph_Agent Moderation_Agent node SHALL perform a secondary deep moderation check using the Groq_Client for any message that the Classifier labels as borderline (confidence score between 0.4 and 0.6), and SHALL use that result as the final label.

---

### Requirement 9: AI Support Assistant with RAG

**User Story:** As a User, I want to chat with an AI assistant that can answer questions from a knowledge base, so that I can get help without waiting for a human agent.

#### Acceptance Criteria

1. THE Chat_Service SHALL expose a dedicated `POST /api/v1/ai/assistant` endpoint that accepts a `query` string and returns a grounded answer generated by the RAG_Pipeline.
2. THE RAG_Pipeline SHALL embed the `query` using Sentence-Transformers and perform a top-5 nearest-neighbor search against the FAISS vector store to retrieve relevant knowledge base documents.
3. THE RAG_Pipeline SHALL pass the retrieved documents as context to the Groq_Client to generate a grounded response.
4. WHEN no relevant documents are found with a cosine similarity score above 0.5, THE RAG_Pipeline SHALL respond with a message indicating that no relevant information was found, rather than generating an unconstrained response.
5. THE RAG_Pipeline SHALL be invokable from the LangGraph_Agent Supervisor node as a tool, allowing the AI Support Assistant to delegate knowledge-base lookups to the RAG_Pipeline node.
6. THE LangGraph_Agent SHALL be structured so that new specialized agent nodes can be added as additional nodes connected to the Supervisor node without modifying existing node implementations.
7. THE LangGraph_Agent SHALL emit a trace to LangSmith for every assistant query, capturing retrieval hit count, source document titles, and final response tokens.

---

### Requirement 10: Semantic Message Search

**User Story:** As a User, I want to search past messages and conversations by meaning, so that I can find relevant content even if I don't remember the exact words used.

#### Acceptance Criteria

1. THE Chat_Service SHALL expose a `POST /api/v1/ai/search` endpoint that accepts a `query` string and returns a ranked list of Messages whose semantic content is similar to the query.
2. WHEN a search request is received, THE AI_Pipeline SHALL embed the `query` using Sentence-Transformers and query the FAISS index of persisted Message embeddings to retrieve the top-10 most similar results.
3. THE AI_Pipeline SHALL return results sorted by cosine similarity score descending, each result including the `message_id`, `conversation_id`, `sender`, `text`, and similarity score.
4. WHEN a new Message is persisted, THE AI_Pipeline SHALL generate and store its embedding in the FAISS index so that it becomes searchable.
5. THE Chat_Service SHALL restrict semantic search results to only Messages from Conversations that the authenticated User is a participant in.

---

### Requirement 11: Sentiment Analysis and Analytics Dashboard

**User Story:** As an Admin, I want to view real-time analytics including message volume, sentiment trends, and response times, so that I can understand platform health and user engagement.

#### Acceptance Criteria

1. WHEN a Message is persisted, THE AI_Pipeline SHALL run the Sentiment_Model on the message text and attach a sentiment label (`positive`, `neutral`, `negative`) and a confidence score to the Message record in PostgreSQL.
2. THE Analytics_Engine SHALL aggregate message volume, sentiment distribution, average response time, and active user count using Pandas and NumPy, reading from PostgreSQL and MySQL.
3. THE Chat_Service SHALL expose a `GET /api/v1/analytics` endpoint, restricted to Admins, that returns the aggregated metrics in JSON format including: `message_volume`, `active_users`, `sentiment_trend` (time-series array), `response_time_ms`, and `flagged_message_count`.
4. THE Frontend SHALL render the analytics data in a dashboard panel using Recharts, displaying at minimum: a message volume time-series chart, a sentiment distribution bar chart, and a flagged-content count card.
5. THE Analytics_Engine SHALL write aggregated daily rollup records to MySQL so that historical trend queries do not degrade PostgreSQL query performance.
6. THE Chat_Service SHALL track smart-reply usage statistics (total requests, cache hit count, average latency) and include these in the `GET /api/v1/analytics` response under an `ai_insights` key.

---

### Requirement 12: User Profile Management

**User Story:** As a User, I want to manage my profile including my display name, avatar, and status message, so that other participants can identify me and see my current availability.

#### Acceptance Criteria

1. THE Chat_Service SHALL expose a `GET /api/v1/users/me` endpoint that returns the authenticated User's profile fields: `id`, `email`, `name`, `role`, `avatar_url`, `status`, and `bio`.
2. THE Chat_Service SHALL expose a `PATCH /api/v1/users/me` endpoint that accepts partial updates to `name`, `status`, and `bio` and persists changes to PostgreSQL.
3. THE Chat_Service SHALL expose a `POST /api/v1/users/me/avatar` endpoint that accepts an image file, passes it through the Image_Moderator, stores the processed image in S3, and updates the User's `avatar_url` in PostgreSQL.
4. WHEN a User updates their `status` field, THE Socket_Gateway SHALL broadcast a `presence_update` event to all Conversations that User participates in, containing the new `status` value.
5. THE Admin_Service (Django) SHALL expose a `/admin/` panel that allows users with the `admin` role to list, create, deactivate, and edit User accounts without requiring direct database access.

---

### Requirement 13: Notification System

**User Story:** As a User, I want to receive in-app notifications for new messages and platform events, so that I am aware of activity even when I am not actively viewing a Conversation.

#### Acceptance Criteria

1. WHEN a new Message arrives in a Conversation the User participates in but is not currently viewing, THE Frontend SHALL display a toast notification containing the sender's name and the first 60 characters of the message text.
2. THE Frontend SHALL maintain a persistent notification center in the sidebar that lists all unread notifications, ordered by timestamp descending.
3. WHEN a User clicks a notification in the notification center, THE Frontend SHALL navigate to the relevant Conversation and mark the notification as read.
4. WHEN all notifications are read, THE Frontend SHALL display the notification count badge as zero.
5. THE Chat_Service SHALL expose a `GET /api/v1/notifications` endpoint that returns the authenticated User's unread notification records from PostgreSQL.
6. THE Chat_Service SHALL expose a `POST /api/v1/notifications/{notification_id}/read` endpoint that marks a single notification as read.

---

### Requirement 14: Frontend UI Shell and Theme

**User Story:** As a User, I want a polished, responsive chat interface with dark/light mode and smooth transitions, so that the application is comfortable to use on any device.

#### Acceptance Criteria

1. THE Frontend SHALL implement a sidebar navigation with four sections: Chats, AI Assistant, Analytics, and Settings, rendered using Tailwind CSS utility classes.
2. THE Frontend SHALL display a split-pane layout on screens wider than 768 px, with the conversation list on the left and the active Conversation panel on the right.
3. WHEN a User toggles the theme, THE Frontend SHALL switch between dark and light mode by toggling a CSS class on the root element and SHALL persist the preference to `localStorage`.
4. WHEN a new Message is rendered, THE Frontend SHALL animate the message card using a Framer Motion fade-in and slide-up transition with a duration of no more than 300 ms.
5. THE Frontend SHALL be functional and visually consistent on viewport widths from 320 px to 2560 px.
6. WHEN a User profile avatar is displayed, THE Frontend SHALL render a fallback initials avatar if `avatar_url` is null or the image fails to load.

---

### Requirement 15: Rate Limiting and Abuse Prevention

**User Story:** As a platform operator, I want the API to enforce rate limits, so that individual clients cannot overwhelm the service with excessive requests.

#### Acceptance Criteria

1. THE Chat_Service SHALL enforce a rate limit of 60 REST API requests per minute per authenticated User, tracked in Redis using a sliding window counter.
2. THE Chat_Service SHALL enforce a rate limit of 30 `send_message` Socket.IO events per minute per authenticated User, tracked in Redis.
3. WHEN a User exceeds the REST API rate limit, THE Chat_Service SHALL return HTTP 429 with a `Retry-After` header indicating the number of seconds until the limit resets.
4. WHEN a User exceeds the WebSocket message rate limit, THE Socket_Gateway SHALL emit a `rate_limit_exceeded` event to that User's socket and SHALL drop the excess messages without broadcasting.
5. THE Chat_Service SHALL enforce a global unauthenticated rate limit of 10 requests per minute per IP address on the `/api/v1/auth/` routes to mitigate brute-force attacks.

---

### Requirement 16: Infrastructure, Containerization, and CI/CD

**User Story:** As a developer, I want the entire stack to run with a single command and have a passing CI pipeline, so that onboarding and deployments are repeatable and reliable.

#### Acceptance Criteria

1. THE System SHALL include a `docker-compose.yml` at the repository root (or `/infra/docker-compose.yml`) that defines services for: `frontend`, `backend-flask`, `backend-django`, `postgres`, `redis`, `mysql`, and `nginx`, and brings all services to a healthy state with a single `docker compose up` command.
2. THE `docker-compose.yml` SHALL define named volumes for PostgreSQL and MySQL data directories so that data persists across container restarts.
3. THE System SHALL include a `.env.example` file listing all required environment variables (database URLs, JWT secrets, Groq API key, AWS credentials, LangSmith API key) with placeholder values and inline comments describing each variable.
4. THE System SHALL include a `Dockerfile` for each of the `frontend`, `backend-flask`, `backend-django`, and `ai-services` directories, using multi-stage builds where applicable to minimize final image size.
5. THE System SHALL include a GitHub Actions workflow file at `.github/workflows/ci.yml` that executes the following jobs in order: lint (ESLint for frontend, flake8 for Python), test (pytest for backend, vitest for frontend), and build (Docker image builds for all services).
6. THE CI/CD pipeline SHALL pass all lint and test jobs before the build job is triggered.
7. THE System SHALL include a `k8s/` directory containing Kubernetes manifests: a `Deployment` and `Service` for `backend-flask`, a `Deployment` and `Service` for `frontend`, a `ConfigMap` for non-secret environment variables, and an `Ingress` resource routing `/api/` to the Flask service and `/` to the frontend.
8. THE System SHALL document the AWS deployment target (ECS or EC2) and S3 bucket configuration in the `README.md` with step-by-step setup instructions.

---

### Requirement 17: Data Persistence Schema

**User Story:** As a backend engineer, I want a clearly defined relational schema across PostgreSQL and MySQL, so that data is normalized, query-efficient, and supports all application features.

#### Acceptance Criteria

1. THE System SHALL define a PostgreSQL schema with at minimum the following tables: `users` (id, email, name, role, password_hash, avatar_url, status, bio, created_at, deleted_at), `conversations` (id, name, type, created_at), `conversation_participants` (conversation_id, user_id), `messages` (id, conversation_id, sender_id, text, file_url, sentiment_label, sentiment_score, classification_label, flagged, deleted_at, created_at), `notifications` (id, user_id, type, payload, read_at, created_at), and `refresh_tokens` (jti, user_id, expires_at, revoked_at).
2. THE System SHALL define a MySQL schema with at minimum the following tables: `analytics_daily_rollup` (date, metric_name, metric_value) and `ai_usage_stats` (date, endpoint, request_count, cache_hits, avg_latency_ms).
3. THE Chat_Service SHALL apply all schema changes via migration scripts (Flask-Migrate / Alembic) so that schema evolution is tracked and repeatable.
4. THE System SHALL define foreign key constraints between `messages.sender_id` → `users.id` and `messages.conversation_id` → `conversations.id` to ensure referential integrity.
5. THE System SHALL create database indexes on `messages.conversation_id` and `messages.created_at` to support efficient paginated message history queries.

---

### Requirement 18: Testing and Quality Assurance

**User Story:** As a developer, I want a comprehensive test suite covering REST endpoints, WebSocket behavior, and AI features, so that regressions are detected before code is merged.

#### Acceptance Criteria

1. THE System SHALL include a pytest test suite under `backend-flask/tests/` with test cases covering: successful and failed authentication flows, RBAC enforcement for each role, paginated message retrieval, message classification, and smart-reply generation.
2. THE System SHALL include a Postman collection under `tests/postman/` containing requests for every REST endpoint defined in this document, with environment variables for `base_url`, `access_token`, and `conversation_id`, and at least one assertion per request validating the response status code and response body schema.
3. THE System SHALL include a Selenium end-to-end test suite under `tests/selenium/` with test cases covering: user login, sending a message and verifying real-time delivery, and triggering the AI summarization flow.
4. THE System SHALL include frontend unit tests (Vitest) covering the message rendering component, the theme toggle behavior, and the smart-reply selection interaction.
5. WHEN a pull request is opened against the `main` branch, THE CI/CD pipeline SHALL automatically execute the full test suite and SHALL block merge if any test fails.

---

### Requirement 19: Security and 12-Factor Compliance

**User Story:** As a security-conscious engineer, I want the system to follow security best practices and 12-Factor app principles, so that it is safe to deploy and easy to configure across environments.

#### Acceptance Criteria

1. THE System SHALL read all secrets (JWT keys, database passwords, API keys) exclusively from environment variables and SHALL NOT hard-code any secret values in source-controlled files.
2. THE Chat_Service SHALL validate and sanitize all text inputs received via REST endpoints and Socket.IO events before processing, rejecting inputs that exceed 4,000 characters with HTTP 400.
3. THE Chat_Service SHALL set `Content-Security-Policy`, `X-Content-Type-Options`, and `X-Frame-Options` response headers on all REST API responses.
4. THE Chat_Service SHALL version all REST API endpoints under `/api/v1/` so that future breaking changes can be introduced under `/api/v2/` without breaking existing clients.
5. THE System SHALL be stateless at the application tier: no session state SHALL be stored in application process memory, with all shared state stored in PostgreSQL or Redis.
6. WHERE the AWS S3 integration is enabled, THE Chat_Service SHALL generate pre-signed S3 URLs with a maximum validity of 1 hour for file downloads, rather than exposing public S3 bucket URLs.

---

### Requirement 20: Documentation and Portfolio Presentation

**User Story:** As a job-seeking engineer, I want thorough documentation including an architecture diagram, setup guide, and resume talking points, so that I can confidently walk through the project in interviews.

#### Acceptance Criteria

1. THE System SHALL include a `README.md` at the repository root with sections for: project overview, architecture diagram (ASCII or linked image), local development setup instructions, environment variable reference, CI/CD pipeline description, and a "Resume Talking Points" section.
2. THE "Resume Talking Points" section SHALL contain at least one bullet point per major technology used (React, Flask, Django, Socket.IO, PostgreSQL, Redis, Groq API, LangGraph, FAISS, Scikit-Learn, TensorFlow/Keras, OpenCV, Docker, GitHub Actions, AWS, Kubernetes), each describing a concrete decision or tradeoff demonstrated by the implementation.
3. THE System SHALL include inline code comments in non-trivial functions across all service layers explaining the intent of the logic, targeting a new engineer onboarding to the codebase.
4. THE System SHALL include an `ARCHITECTURE.md` or equivalent section documenting the data flow for the three core user journeys: sending a real-time message, invoking the AI Support Assistant, and uploading an image with moderation.
