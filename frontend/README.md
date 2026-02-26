# Pulse Frontend

React 19 + Vite frontend for Pulse, wired to the `backend-hono` API.

## Quick Start

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Environment

Use `.env` in this folder.

```env
VITE_API_URL=http://localhost:8080
VITE_CLERK_PUBLISHABLE_KEY=your_key_if_used
```

`VITE_API_URL` is the active API base variable used by `lib/apiClient.ts`.

## Current API Surface Used by Frontend

Implemented and active:

- `/api/account`
- `/api/riskflow/*`
- `/api/market/vix`
- `/api/ai/*`
- `/api/trading/*`
- `/api/projectx/*`
- `/api/notifications`
- `/api/boardroom/*`
- `/api/agents/*`
- `/api/polymarket/*`

Partially wired / pending parity:

- Autopilot route consumption from frontend paths
- ER/events paths currently include stubs in service layer pending backend parity
- NTN report generation path is currently stubbed in frontend service wrapper

## Important Notes

- The app currently uses local single-user behavior in runtime flow; production auth hardening is tracked separately.
- Some service wrappers include fallback/stub behavior by design until backend endpoints are finalized.

## Main Frontend Areas

- `components/layout/` for shell, tabs, top header, panel orchestration
- `components/feed/`, `components/analysis/`, `components/executive/`, `components/chat/`
- `lib/apiClient.ts` and `lib/services.ts` for backend integration
- `contexts/` for app-level state providers

## License

Proprietary - Solvys Technologies / Priced In Research
