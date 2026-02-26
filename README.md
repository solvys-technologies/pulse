# Pulse — Integrated Trading Environment

Pulse is the local + cloud command center for Priced In Capital workflows across market feed, boardroom operations, AI chat, and trade proposal orchestration.

## Current Structure

```text
pulse/
├── frontend/              # React 19 + Vite app
├── backend-hono/          # Hono API (Node 20), Fly.io target
├── docs/                  # Product and implementation docs
├── knowledge-base/        # Handoffs and strategy references
└── .cursor/skills/        # Local agent skill context
```

## What Is Implemented

- Frontend shell with tab-based navigation (`feed`, `analysis`, `news`, `executive`, `chatroom`, `notion`, `settings`)
- Backend route groups for market, boardroom, account, notifications, trading, projectx, riskflow, psych, ai, agents, polymarket
- RiskFlow feed + polling/cron infrastructure
- Boardroom UI + backend session bridge

## Known Gaps (as of 2026-02-12)

- Autopilot route module exists but is not registered in main route aggregation
- Trade execution path is still simulated in core proposal service flows
- Several frontend service methods remain intentionally stubbed pending endpoint parity
- Auth middleware is local single-user mode (`local-user`) and not production-enforced yet

See `docs/OpenClaw Move-In Sprint Plan.md` and Notion page `Pulse Engineering Audit — 2026-02-12` for the active closure plan.

## Local Development

### Prerequisites

- Node.js 20+
- npm or Bun
- PostgreSQL/Neon credentials for backend data features

### Backend

```bash
cd backend-hono
npm install
npm run dev
```

Backend runs on `http://localhost:8080`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on Vite default port unless overridden.

## Environment Variables

Core variables used today:

- `VITE_API_URL` (frontend API base, defaults to `http://localhost:8080`)
- `NEON_DATABASE_URL` or `DATABASE_URL`
- `CLERK_SECRET_KEY` (health/config checks; full production auth path still pending hardening)
- `PROJECTX_USERNAME`, `PROJECTX_API_KEY`, related ProjectX config vars

## Deployment Reality

- Frontend: Vercel
- Backend: Fly.io (Hono service)

## License

Proprietary - Solvys Technologies
