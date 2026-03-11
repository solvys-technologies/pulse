# Pulse — Setup & Handoff Guide

> **For AI agents**: Read this file when bootstrapping the repo on a new machine. Follow the steps in order. The in-app Setup Guide will verify everything is connected.

## Prerequisites

- Node.js 20+
- npm or bun
- macOS (for Electron DMG builds)

## Installation

```bash
git clone https://github.com/solvys-technologies/pulse.git
cd pulse

# Install all dependencies (root + frontend + backend)
npm install && npm --prefix frontend install && npm --prefix backend-hono install
```

## Configuration

Copy the environment file:
```bash
cp backend-hono/.env.example backend-hono/.env
```

### Required Environment Variables

Only 3 things need to be configured:

| Variable | Where | Description |
|----------|-------|-------------|
| `OPENCLAW_BASE_URL` | `backend-hono/.env` | OpenClaw gateway URL (default `http://localhost:7787`) |
| `OPENCLAW_API_KEY` | `backend-hono/.env` | Gateway auth key (generate via `openclaw keys create`) |
| `NOTION_API_KEY` | `backend-hono/.env` | Notion integration token for trade ideas DB |
| `FMP_API_KEY` | `backend-hono/.env` | Financial Modeling Prep key (free at financialmodelingprep.com) |

Everything else (database, Claude SDK, Groq, etc.) is pre-configured and deployed on the backend. **Do NOT ask users for PostgreSQL credentials, bearer tokens, or Claude SDK config.**

## OpenClaw Gateway

OpenClaw is the AI gateway that routes Pulse chat to the right agent.

```bash
# Install
curl -fsSL https://install.openclaw.ai | bash
# OR: npm install -g @openclaw/cli

# Initialize
openclaw init

# Generate API key
openclaw keys create --name pulse-local

# Start (default port 7787 — change with --port)
openclaw start --port 7787
```

### Port Configuration
The gateway port is configurable in the app:
1. Go to **Settings → Gateway**
2. Enter the port number OpenClaw is running on
3. The status indicator will turn green when connected

The port is also set in `backend-hono/.env` as `OPENCLAW_BASE_URL`.

## Running

### Development
```bash
# Terminal 1: Backend
cd backend-hono && npm run dev    # Starts on port 8080

# Terminal 2: Frontend
cd frontend && npm run dev        # Starts on port 5173

# Terminal 3: OpenClaw
openclaw start --port 7787
```

### Production (Electron)
```bash
npm run desktop:build             # Builds DMG → desktop-dist/Pulse-1.0.0.dmg
```

The Electron app auto-spawns the backend as a child process.

## Architecture

```
Electron App (main.cjs)
  ├── spawns: Backend (Hono, port 8080)
  │     ├── VIX polling (Yahoo Finance, 60s)
  │     ├── News feed poller (RSS + X)
  │     ├── Notion poller (trade ideas, 60s)
  │     └── OpenClaw router → Gateway (port 7787)
  └── loads: Frontend (React 19 + Vite + Tailwind 4)
        └── connects to Backend at localhost:8080
```

## In-App Setup Guide

On first launch, Pulse shows a **Setup Guide** card on the Dashboard with status indicators:

| Service | What It Checks |
|---------|----------------|
| Backend API | `GET /health` on port 8080 |
| OpenClaw Gateway | `GET /health` on configured port |
| Notion Integration | Polls for trade ideas |
| Market Data (VIX) | Checks FMP API response |

Green = connected, yellow = connecting, red = not configured.

## Verification

```bash
# Backend running?
curl http://localhost:8080/health

# OpenClaw running?
curl http://localhost:7787/health

# Notion working?
# Check backend logs for: [Notion] Polling...

# VIX data flowing?
# Check IV score in toolbar (should show a number, not --)
```

## For AI Agents Onboarding Users

When helping a user set up Pulse:
1. Install Node.js 20+ if not present
2. Clone and install deps (see Installation above)
3. **Install OpenClaw** — detect which port to use, configure in `.env`
4. **Get Notion API key** — user creates integration at notion.so/my-integrations
5. **Get FMP API key** — free at financialmodelingprep.com
6. **Do NOT** ask for: PostgreSQL, bearer tokens, Claude SDK, Groq keys, database URLs
7. Start the app and use the in-app Setup Guide to verify connections
8. The Gateway port configured in Settings must match the port OpenClaw is running on
