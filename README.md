# ChatFlow AI — Real-Time Chat Platform

A production-quality AI-powered real-time chat application built with a Flask backend and a modern TypeScript + React frontend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript (strict), Vite, TailwindCSS |
| State | Zustand (auth, chat, UI stores) |
| Data fetching | TanStack React Query v5 |
| Routing | React Router v6 (lazy-loaded, code-split) |
| Forms | React Hook Form + Zod validation |
| Animations | Framer Motion |
| Notifications | react-hot-toast |
| Backend | Flask, Flask-SocketIO, SQLite / MySQL |
| Auth | JWT (access + refresh token) |
| AI | Groq API (smart replies, sentiment, summarisation) |
| Real-time | Socket.IO |
| Testing | Vitest + Testing Library |

---

## Project Structure

```
Chatboat-Application/
├── frontend/                  # React 18 + TypeScript SPA
│   ├── src/
│   │   ├── assets/doodles/    # Inline SVG decorative components
│   │   ├── components/
│   │   │   ├── ui/            # Skeleton, Button, Badge, Avatar
│   │   │   ├── layout/        # Layout, Sidebar, Header, ErrorBoundary, ProtectedRoute
│   │   │   ├── dashboard/     # MetricCard, skeleton screens
│   │   │   ├── chat/          # ConversationList, MessageThread, MessageBubble, etc.
│   │   │   ├── ai/            # AIAssistant
│   │   │   ├── analytics/     # AnalyticsDashboard
│   │   │   └── ...
│   │   ├── features/
│   │   │   ├── auth/          # LoginPage, RegisterPage, schemas (Zod)
│   │   │   ├── dashboard/     # DashboardPage
│   │   │   ├── chat/          # ChatPage
│   │   │   ├── ai/            # AIAssistantPage
│   │   │   ├── analytics/     # AnalyticsPage
│   │   │   └── settings/      # SettingsPage
│   │   ├── hooks/             # useAuth, useTheme, useToast, useAnalytics, useSocket, ...
│   │   ├── lib/               # apiClient (Axios + JWT interceptors), queryClient, queryKeys
│   │   ├── store/             # authStore, chatStore, uiStore (Zustand)
│   │   └── types/             # Shared TypeScript interfaces
│   ├── tailwind.config.ts     # Navy/teal custom palette, dark mode
│   ├── vite.config.ts         # Code splitting, vendor chunks, aliases
│   └── tsconfig.json          # strict: true, ES2020
├── backend-flask/             # Flask REST API + Socket.IO
├── backend-django/            # Django admin backend
├── ai-services/               # Python AI microservices (RAG, sentiment, classifier)
├── .kiro/specs/               # Kiro spec files (requirements, design, tasks)
└── ...
```

---

## Frontend Setup

### Prerequisites
- Node.js 18+
- npm 9+

### Install dependencies

```bash
cd frontend
npm install
```

### Environment variables

Copy the example file and fill in values:

```bash
cp .env.example .env.local
```

```env
# .env.local
VITE_API_URL=http://localhost:5001
VITE_SOCKET_URL=http://localhost:5001
```

### Start development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Production build

```bash
npm run build
# Output: dist/ with hashed asset filenames
```

### Run tests

```bash
npx vitest --run
```

---

## Backend Setup (Flask)

### Prerequisites
- Python 3.10+
- Redis (optional, for Socket.IO pub/sub in multi-worker mode)

### Install dependencies

```powershell
cd backend-flask
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

### Environment variables

```env
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
GROQ_API_KEY=your-groq-api-key         # For AI features
REDIS_URL=redis://localhost:6379/0      # Optional
DATABASE_URL=sqlite:///chatapp.db       # Or MySQL connection string
```

### Run for development

```bash
python local_server.py
# Runs on http://localhost:5001
```

---

## Key Features

### Dashboard
- Four live metric cards (Total Users, Messages Sent, AI Usage, Avg Response Time)
- Animated skeleton loading screens
- SVG doodle background decorations (DotGrid, WaveCurve, CornerAccent)
- Responsive grid: 1 col → 2 col → 4 col

### Authentication
- Login and Register forms with Zod schema validation
- Inline field error messages on blur
- JWT access + refresh token flow with automatic token refresh
- Persistent sessions via localStorage

### Chat
- Real-time messaging via Socket.IO
- Conversation list with unread badges
- Message thread with sentiment badges
- AI smart reply suggestions
- Typing indicators
- Framer Motion fade-in/slide-up animations on new messages

### AI Assistant
- Groq-powered smart replies
- Message sentiment analysis (positive / neutral / negative)
- Conversation summarisation
- RAG pipeline for context-aware responses

### Settings
- Profile form (name, status, bio) with Zod validation
- Light/dark theme toggle (persisted to localStorage)
- Account info display
- Secure logout

### Developer Experience
- TypeScript strict mode — zero `tsc --noEmit` errors
- ESLint + Prettier enforced
- React Query caching (30s staleTime, 2 retries, exponential backoff)
- Code splitting: each page is a separate JS chunk loaded on demand
- `React.memo` on all pure presentational components
- `useMemo` for derived computations in DashboardPage and ChatPage

---

## Architecture

### Request / Response Flow

```
User interaction
  → React component
    → React Query hook (useAnalytics, useMessages, etc.)
      → apiClient (Axios + JWT interceptor)
        → Flask backend (port 5001)
      → React Query cache (staleTime 30s)
    → Zustand store update (auth/UI side effects)
  → Toast notification (on error or success)
```

### Real-Time Socket Flow

```
Socket.IO event (new_message)
  → useSocket hook
    → queryClient.setQueryData(['messages', conversationId])
      → ChatPage re-renders with new message (Framer Motion fade-in)
    → chatStore.addMessage (notification badge count)
```

---

## Quick Start (All Services)

From the repository root:

```powershell
# Windows PowerShell
./start-dev.ps1
```

```bat
REM Windows CMD
start-dev.bat
```

```bash
# macOS / Linux
./start.sh
```

---

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and run `tsc --noEmit` + `npx vitest --run` to verify
3. Push and open a Pull Request against `main`

---

## License

MIT
