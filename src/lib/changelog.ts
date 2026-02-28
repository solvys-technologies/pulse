// [claude-code 2026-02-26] Shared change log for multi-agent coordination.

export type ChangelogEntry = {
  date: string;
  agent: 'claude-code' | string;
  summary: string;
  files: string[];
};

export const changelog: ChangelogEntry[] = [
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
];

