// [claude-code 2026-02-26] Shared change log for multi-agent coordination.

export type ChangelogEntry = {
  date: string;
  agent: 'claude-code' | string;
  summary: string;
  files: string[];
};

export const changelog: ChangelogEntry[] = [
  {
    date: '2026-03-03T19:00:00.000Z',
    agent: 'claude-code',
    summary:
      'Phase 2 Smart Layout: converted overlay sidebars to docked side panels. History docks left, Checkpoints docks right. Panel open/closed state persists to localStorage via usePanelState hook. Panels animate open/close with CSS width transition (240ms). Fixed onKeyPress → onKeyDown deprecation.',
    files: [
      'frontend/components/ChatInterface.tsx',
    ],
  },
  {
    date: '2026-03-03T18:00:00.000Z',
    agent: 'claude-code',
    summary:
      'Phase 1B checkpoints: enhanced sidebar with date-grouped bookmarks (Today/Yesterday/date), click-away backdrop, compact card layout, Bookmark icon header, footer count. Added groupCheckpointsByDate helper.',
    files: [
      'frontend/components/ChatInterface.tsx',
    ],
  },
  {
    date: '2026-03-03T00:30:00.000Z',
    agent: 'claude-code',
    summary: 'Rithmic Gateway: Python sidecar (FastAPI + async_rithmic) at rithmic-gateway/gateway.py, HTTP API on localhost:3002. Updated rithmic-service.ts to proxy calls to gateway. Added RITHMIC-GATEWAY.md OpenClaw handoff with semi-autonomous + fully-autonomous mode architecture.',
    files: [
      'rithmic-gateway/gateway.py',
      'rithmic-gateway/requirements.txt',
      'rithmic-gateway/.env.example',
      'backend-hono/src/services/rithmic-service.ts',
      'docs/quantconnect/RITHMIC-GATEWAY.md',
    ],
  },
  {
    date: '2026-03-03T01:00:00.000Z',
    agent: 'claude-code',
    summary: 'Phase 1 autopilot: added POST /api/trading/test-trade endpoint wired to Rithmic (primary) / ProjectX (fallback via PRIMARY_BROKER env). Added placeOrder() + searchContracts() to projectx/client.ts. Configured QuantConnect MCP server at localhost:3001.',
    files: [
      'backend-hono/src/services/projectx/client.ts',
      'backend-hono/src/services/trading-service.ts',
      'backend-hono/src/routes/trading/handlers.ts',
      'backend-hono/src/routes/trading/index.ts',
      'docs/quantconnect/AUTOPILOT-IMPLEMENTATION-PHASE-1.md',
    ],
  },
  {
    date: '2026-02-26T16:22:30.000Z',
    agent: 'claude-code',
    summary:
      'Converted Boardroom to a Notion-embedded meeting surface with a countdown timer, documented PIC Notion entity IDs, and added a Kimi Claw backend+frontend trigger for SMS/iMessage workflows.',
    files: [
      'frontend/components/BoardroomView.tsx',
      'frontend/lib/services.ts',
      'frontend/README.md',
      'backend-hono/src/routes/index.ts',
      'backend-hono/src/routes/kimi/index.ts',
      'backend-hono/src/routes/kimi/handlers.ts',
      'backend-hono/src/services/kimi-claw-service.ts',
      'backend-hono/tsconfig.json',
      'backend-hono/.env.example',
      'knowledge-base/notion/PIC-NOTION-ENTITY-MAP.md',
    ],
  },
  {
    date: '2026-02-26T16:26:00.000Z',
    agent: 'claude-code',
    summary:
      'Improved embedded OAuth flows by allowing user-activated top navigation in browser iframes and enabling Electron webview popup handling for Notion/Google/Apple sign-in windows.',
    files: ['frontend/components/layout/EmbeddedBrowserFrame.tsx', 'electron/main.cjs'],
  },
  {
    date: '2026-02-26T16:34:00.000Z',
    agent: 'claude-code',
    summary:
      'Removed manual Kimi SMS UI/API wiring, added cron-derived boardroom meeting schedule endpoint, and updated boardroom countdown + Live/Inactive indicator to follow the schedule.',
    files: [
      'frontend/components/BoardroomView.tsx',
      'frontend/lib/services.ts',
      'backend-hono/src/services/boardroom-schedule.ts',
      'backend-hono/src/routes/boardroom/handlers.ts',
      'backend-hono/src/routes/boardroom/index.ts',
      'backend-hono/src/routes/index.ts',
      'backend-hono/.env.example',
      'knowledge-base/notion/PIC-NOTION-ENTITY-MAP.md',
    ],
  },
  {
    date: '2026-02-26T18:45:00.000Z',
    agent: 'claude-code',
    summary:
      'Fixed missing user bubbles in Ask Harp/Intervention, added per-agent persistent OpenClaw threads with agent override support, introduced chat checkpoints for recall, and adjusted Mission Control RiskFlow + Account Tracker KPIs (status + platform tracker).',
    files: [
      'backend-hono/src/services/clawdbot-sessions.ts',
      'backend-hono/src/routes/ai/handlers/chat.ts',
      'backend-hono/src/types/ai-chat.ts',
      'frontend/components/chat/hooks/useOpenClawChat.ts',
      'frontend/components/chat/PulseFloatingChat.tsx',
      'frontend/components/executive/ResearchDepartment.tsx',
      'frontend/components/ChatInterface.tsx',
      'frontend/lib/chatCheckpoints.ts',
      'frontend/hooks/usePersistentOpenClawConversation.ts',
      'frontend/lib/openclawAgentRouting.ts',
      'frontend/components/RiskFlowPanel.tsx',
      'frontend/components/layout/MainLayout.tsx',
      'frontend/components/mission-control/AccountTrackerWidget.tsx',
    ],
  },
  {
    date: '2026-02-26T19:05:00.000Z',
    agent: 'claude-code',
    summary:
      'Added a dockable PsychAssist widget for Zen layout: drag the widget into the heading toolbar to fuse, or click the PiP button to dock/undock.',
    files: [
      'frontend/components/layout/PsychAssistDockable.tsx',
      'frontend/components/layout/MainLayout.tsx',
      'frontend/components/layout/TopHeader.tsx',
      'frontend/components/layout/FloatingWidget.tsx',
    ],
  },
  {
    date: '2026-02-26T19:18:00.000Z',
    agent: 'claude-code',
    summary:
      'Fixed Full Screen / Expand to Analysis on floating chat: exit TopStepX when expanding so the Analysis (sidebar) chat is shown instead of a white screen.',
    files: ['frontend/components/layout/MainLayout.tsx'],
  },
  {
    date: '2026-02-26T19:28:00.000Z',
    agent: 'claude-code',
    summary:
      'Fixed React #300 (fewer hooks): move early return after all hooks in PulseFloatingChat. Gateway health check URL configurable via VITE_GATEWAY_URL.',
    files: ['frontend/components/chat/PulseFloatingChat.tsx', 'frontend/contexts/GatewayContext.tsx'],
  },
  {
    date: '2026-02-28T06:30:00.000Z',
    agent: 'openclaw',
    summary:
      'Zen layout polish pass: widened docked PsychAssist space, removed Zen floating Day P&L card, stripped iframe borders/padding, added power-off controls, tightened Mission Control width + card ordering, improved RiskFlow preview density, moved Account Tracker loading status to header, removed Loss Limit/Daily Target KPIs, and disabled mock RiskFlow fallback in News.',
    files: [
      'frontend/components/layout/PsychAssistDockable.tsx',
      'frontend/components/layout/TopHeader.tsx',
      'frontend/components/layout/MainLayout.tsx',
      'frontend/components/layout/FloatingWidget.tsx',
      'frontend/components/TopStepXBrowser.tsx',
      'frontend/components/mission-control/MissionControlPanel.tsx',
      'frontend/components/mission-control/AccountTrackerWidget.tsx',
      'frontend/components/RiskFlowPanel.tsx',
      'frontend/components/feed/NewsSection.tsx',
    ],
  },
  {
    date: '2026-03-03T04:00:00.000Z',
    agent: 'claude-code',
    summary:
      'Added Rithmic test trade endpoint plan to AGENT-2 task doc: service (executeTestTrade + getPointValue for micros), handler, route spec with strategy-specific targets, PDPT caps, scale-in limits. Types already completed in prior session.',
    files: ['docs/AGENT-2-CLAUDE-CODE-TASKS.md'],
  },
];

