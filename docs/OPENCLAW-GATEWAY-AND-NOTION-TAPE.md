# OpenClaw Gateway & Notion → Active Tape (follow-up plan)

## OpenClaw gateway (port 7787)

- **Frontend** ([GatewayContext.tsx](../frontend/contexts/GatewayContext.tsx)): Default `VITE_GATEWAY_URL` is `http://localhost:7787`. Used for gateway health checks and any direct frontend→gateway usage. Set `VITE_GATEWAY_URL` in `.env` to match your deployed OpenClaw (e.g. `http://localhost:7787` or your server URL).
- **Backend** (OpenClaw chat and intervention):
  - [backend-hono/src/config/ai-config.ts](../backend-hono/src/config/ai-config.ts): default `OPENCLAW_BASE_URL` = `http://localhost:7787`
  - [backend-hono/src/services/openclaw-service.ts](../backend-hono/src/services/openclaw-service.ts): same default
  - [backend-hono/src/services/openclaw-handler.ts](../backend-hono/src/services/openclaw-handler.ts): same default for `/v1/chat/completions` calls
  - Set `OPENCLAW_BASE_URL=http://localhost:7787` (or your OpenClaw base URL) and `OPENCLAW_API_KEY` in backend `.env` so the Analysis tab and intervention panel use the correct OpenClaw agent.

## Notion items → active tape on dashboard

- **Goal:** After Notion/Research items are loaded, ensure they are inserted into the “active tape” on the dashboard so the tape reflects the same content.
- **Approach (for later):** Add a short wait or subscription so that when Notion/riskflow items are fetched (e.g. from the gateway or RiskFlow API), the dashboard tape (e.g. ExecutiveDashboard active tape or MinimalFeedSection) is updated with those items. Options: (1) shared context or backend endpoint that returns “tape” items including Notion-sourced entries; (2) client-side merge of Notion fetch result into the same feed/tape state that the dashboard uses; (3) backend job that syncs Notion → riskflow/tape and frontend just refetches tape. Implement once Notion sync path is decided.
