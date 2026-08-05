# Chatboat Application

This repository contains a Flask backend and a React + Vite frontend for a chat application.

## Backend setup

1. Create a virtual environment and activate it:

```powershell
cd backend-flask
python -m venv .venv
.venv\Scriptsctivate
```

2. Install Python dependencies:

```powershell
pip install -r requirements.txt
```

3. Configure environment variables:

- `REDIS_URL` — Redis connection string for Socket.IO pub/sub and caching, e.g. `redis://localhost:6379/0`
- `FLASK_APP` — optional, not required for direct runner
- `FLASK_ENV` — optional, e.g. `development`

4. Run the backend for development:

```powershell
python run_simple.py
```

That uses the plain Flask dev server and is useful for local frontend integration.

If you want to run the Socket.IO-enabled backend:

```powershell
python app.py
```

You may also need `eventlet` and a running Redis instance for full real-time support.

## Frontend setup

1. Install Node dependencies:

```bash
cd frontend
npm install
```

2. Start the development frontend:

```bash
npm run dev
```

3. Open the Vite local URL shown in the terminal.

## Environment variables for frontend

Create `frontend/.env.development` or set values in your shell:

```text
VITE_API_BASE=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

## Development flow

- Register or login from the frontend.
- Create a new conversation.
- Select the conversation.
- Send messages in the chat panel.

## Notes

- The frontend stores the JWT access token in `localStorage`.
- The backend includes a fallback runner in `backend-flask/run_simple.py` for quick local API testing.
- If you use `python app.py`, make sure Redis is available and `REDIS_URL` is configured.

## Quick start scripts

Use the bundled helper scripts from the repository root:

```powershell
./start-dev.ps1
```

or on Windows CMD:

```bat
start-dev.bat
```
