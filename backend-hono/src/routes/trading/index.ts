/**
 * Trading Routes
 * Route registration for /api/trading endpoints
 */

import { Hono } from 'hono';
import {
  handleGetPositions,
  handleToggleAlgo,
  handleGetAlgoStatus,
  handleTestTrade,
} from './handlers.js';

export function createTradingRoutes(): Hono {
  const router = new Hono();

  // GET /api/trading/positions - List user positions
  router.get('/positions', handleGetPositions);

  // GET /api/trading/algo-status - Get algo trading status
  router.get('/algo-status', handleGetAlgoStatus);

  // POST /api/trading/toggle-algo - Toggle algo trading
  router.post('/toggle-algo', handleToggleAlgo);

  // POST /api/trading/test-trade - Fire 1-contract market order via ProjectX
  router.post('/test-trade', handleTestTrade);

  return router;
}
