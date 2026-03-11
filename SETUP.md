# Pulse — Setup & Handoff Guide (Windows Cross-Platform)

> **For AI agents**: Read this file when bootstrapping the repo on a new machine. Follow the steps in order. The in-app Setup Guide will verify everything is connected.

## Prerequisites

- Node.js 20+
- npm or bun
- Windows 10/11, macOS, or Linux

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
| `OPENROUTER_API_KEY` | `backend-hono/.env` | OpenRouter API key (get at openrouter.ai/keys) |
| `NOTION_API_KEY` | `backend-hono/.env` | Notion integration token for trade ideas DB |
| `FMP_API_KEY` | `backend-hono/.env` | Financial Modeling Prep key (free at financialmodelingprep.com) |

Everything else is pre-configured. **Do NOT ask users for PostgreSQL credentials, bearer tokens, or Claude SDK config.**

## AI Provider — OpenRouter

Pulse uses **OpenRouter** as the AI gateway. All chat routes through Claude Opus 4.6.

### Model Hierarchy
| Priority | Model | OpenRouter ID | Use Case |
|----------|-------|---------------|----------|
| Primary | Claude Opus 4.6 | `anthropic/claude-opus-4-6` | All agent tasks |
| Fallback | Claude Sonnet 4.6 | `anthropic/claude-sonnet-4-6` | When Opus unavailable |
| Last resort | Claude Haiku 4.5 | `anthropic/claude-haiku-4-5-20251001` | Rate limit fallback |

### Setup
1. Go to [openrouter.ai](https://openrouter.ai)
2. Create an account and generate an API key
3. Add credit to your account (Opus costs ~$15/M input, $75/M output tokens)
4. Set `OPENROUTER_API_KEY` in `backend-hono/.env`

No local gateway or CLI tool is needed — OpenRouter is cloud-hosted.

## Running

### Development
```bash
# Terminal 1: Backend
cd backend-hono && npm run dev    # Starts on port 8080

# Terminal 2: Frontend
cd frontend && npm run dev        # Starts on port 5173
```

### Production (Electron)
```bash
# macOS
npm run desktop:build             # Builds DMG → desktop-dist/Pulse-1.0.0.dmg

# Windows (coming soon)
# npm run desktop:build:win       # Builds .exe installer
```

The Electron app auto-spawns the backend as a child process.

## Architecture

```
Electron App (main.cjs)
  ├── spawns: Backend (Hono, port 8080)
  │     ├── VIX polling (Yahoo Finance, 60s)
  │     ├── News feed poller (RSS + X)
  │     ├── Notion poller (trade ideas, 60s)
  │     └── OpenRouter → Claude Opus 4.6
  └── loads: Frontend (React 19 + Vite + Tailwind 4)
        └── connects to Backend at localhost:8080
```

## In-App Setup Guide

On first launch, Pulse shows a **Setup Guide** card on the Dashboard with status indicators:

| Service | What It Checks |
|---------|----------------|
| Backend API | `GET /health` on port 8080 |
| OpenRouter AI | Backend connectivity (routes to OpenRouter) |
| Notion Integration | Polls for trade ideas |
| Market Data (VIX) | Checks FMP API response |

Green = connected, yellow = connecting, red = not configured.

## Verification

```bash
# Backend running?
curl http://localhost:8080/health

# Notion working?
# Check backend logs for: [Notion] Polling...

# VIX data flowing?
# Check IV score in toolbar (should show a number, not --)

# OpenRouter working?
# Send a message in chat — should get Claude Opus 4.6 response
```

## For AI Agents Onboarding Users

When helping a user set up Pulse:
1. Install Node.js 20+ if not present
2. Clone and install deps (see Installation above)
3. **Get OpenRouter API key** — user signs up at openrouter.ai/keys
4. **Get Notion API key** — user creates integration at notion.so/my-integrations
5. **Get FMP API key** — free at financialmodelingprep.com
6. **Do NOT** ask for: PostgreSQL, bearer tokens, Claude SDK, Groq keys, database URLs, OpenClaw
7. Start the app and use the in-app Setup Guide to verify connections
