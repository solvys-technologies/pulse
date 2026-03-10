/**
 * Route Aggregation
 * Central registration of all API routes
 */

import type { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { createAccountRoutes } from './account/index.js';
import { createMarketRoutes } from './market/index.js';
import { createNotificationRoutes } from './notifications/index.js';
import { createTradingRoutes } from './trading/index.js';
import { createProjectXRoutes } from './projectx/index.js';
import { createRiskFlowRoutes } from './riskflow/index.js';
import { createPsychAssistRoutes } from './psych-assist.js';
import { createAiRoutes } from './ai/index.js';
import { createAgentRoutes } from './agents/index.js';
import { createPolymarketRoutes } from './polymarket/index.js';
import { createBoardroomRoutes } from './boardroom/index.js';
import { createRithmicRoutes } from './rithmic/index.js';
import { createNotionRoutes } from './notion/index.js';
import { createNarrativeRoutes } from './narrative/index.js';
import { createERRoutes } from './er/index.js';
import { createVoiceRoutes } from './voice/index.js';
import { createRegimeRoutes } from './regimes/index.js';
import { createEarningsRoutes } from './earnings/index.js';
import { createGitHubAuthRoutes } from './auth/github.js';
import { createVersionRoutes } from './version/index.js';
import { createMarketDataRoutes } from './market-data/index.js';
import { createMcpRoutes } from './mcp/index.js';

export function registerRoutes(app: Hono): void {
  // Public routes (no auth required)
  // GitHub OAuth (must be public for login flow)
  app.route('/api/auth/github', createGitHubAuthRoutes());
  // Version check (public, used by auto-update prompt)
  app.route('/api/version', createVersionRoutes());
  // Phase 2: Market routes - VIX is public
  app.route('/api/market', createMarketRoutes());
  app.route('/api/boardroom', createBoardroomRoutes());
  // Notion polling routes — internal org data, no user auth required
  app.route('/api/notion', createNotionRoutes());
  // Regime tracker — public, returns active trading regimes
  app.route('/api/regimes', createRegimeRoutes());
  // Market data — FMP quotes/VIX + Unusual Whales GEX/walls/flow (public, agents consume directly)
  app.route('/api/market-data', createMarketDataRoutes());
  // Narrative scoring — LLM-scored catalyst candidates
  app.route('/api/narrative', createNarrativeRoutes());

  // Protected routes (auth required) — use base path so exact path (e.g. GET /api/account) is covered
  app.use('/api/account', authMiddleware);
  app.use('/api/account/*', authMiddleware);
  app.use('/api/notifications', authMiddleware);
  app.use('/api/notifications/*', authMiddleware);
  app.use('/api/trading', authMiddleware);
  app.use('/api/trading/*', authMiddleware);
  app.use('/api/projectx', authMiddleware);
  app.use('/api/projectx/*', authMiddleware);
  app.use('/api/rithmic', authMiddleware);
  app.use('/api/rithmic/*', authMiddleware);
  // RiskFlow routes - exclude cron endpoint from auth
  const riskflowAuth = async (c: Parameters<typeof authMiddleware>[0], next: Parameters<typeof authMiddleware>[1]) => {
    if (c.req.path.includes('/cron/')) {
      return next();
    }
    return authMiddleware(c, next);
  };
  app.use('/api/riskflow', riskflowAuth);
  app.use('/api/riskflow/*', riskflowAuth);
  app.use('/api/psych', authMiddleware);
  app.use('/api/psych/*', authMiddleware);
  app.use('/api/ai', authMiddleware);
  app.use('/api/ai/*', authMiddleware);
  app.use('/api/agents', authMiddleware);
  app.use('/api/agents/*', authMiddleware);
  app.use('/api/polymarket', authMiddleware);
  app.use('/api/polymarket/*', authMiddleware);
  app.use('/api/er', authMiddleware);
  app.use('/api/er/*', authMiddleware);
  app.use('/api/voice', authMiddleware);
  app.use('/api/voice/*', authMiddleware);
  app.use('/api/er-scoring', authMiddleware);
  app.use('/api/er-scoring/*', authMiddleware);
  app.use('/api/mcp', authMiddleware);
  app.use('/api/mcp/*', authMiddleware);

  // Phase 1: Account routes
  app.route('/api/account', createAccountRoutes());

  // Phase 2: Notification routes
  app.route('/api/notifications', createNotificationRoutes());

  // Phase 2: Trading routes
  app.route('/api/trading', createTradingRoutes());

  // Phase 3: ProjectX routes
  app.route('/api/projectx', createProjectXRoutes());

  // Rithmic routes (Autopilot primary broker scaffold)
  app.route('/api/rithmic', createRithmicRoutes());

  // Phase 4: RiskFlow routes
  app.route('/api/riskflow', createRiskFlowRoutes());

  // Psych assist routes (existing)
  app.route('/api/psych', createPsychAssistRoutes());

  // Phase 5: AI routes
  app.route('/api/ai', createAiRoutes());

  // Phase 6: Agent routes
  app.route('/api/agents', createAgentRoutes());

  // Polymarket routes
  app.route('/api/polymarket', createPolymarketRoutes());

  // ER telemetry routes
  app.route('/api/er', createERRoutes());

  // Voice assistant routes
  app.route('/api/voice', createVoiceRoutes());

  // ER Scoring history routes (psych journaling)
  app.route('/api/er-scoring', createEarningsRoutes());

  // MCP server registry
  app.route('/api/mcp', createMcpRoutes());
}
