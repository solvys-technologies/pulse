/**
 * Trading Handlers
 * Request handlers for trading endpoints
 */

import type { Context } from 'hono';
import * as tradingService from '../../services/trading-service.js';
import type { ToggleAlgoRequest } from '../../types/trading.js';

/**
 * GET /api/trading/positions
 * Get user positions
 */
export async function handleGetPositions(c: Context) {
  const userId = c.get('userId') as string | undefined;

  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const positions = await tradingService.getPositions(userId);
    return c.json(positions);
  } catch (error) {
    console.error('[Trading] Get positions error:', error);
    return c.json({ error: 'Failed to fetch positions' }, 500);
  }
}

/**
 * GET /api/trading/algo-status
 * Get algo trading status
 */
export async function handleGetAlgoStatus(c: Context) {
  const userId = c.get('userId') as string | undefined;

  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const status = await tradingService.getAlgoStatus(userId);
    return c.json(status);
  } catch (error) {
    console.error('[Trading] Get algo status error:', error);
    return c.json({ error: 'Failed to fetch algo status' }, 500);
  }
}

/**
 * POST /api/trading/test-trade
 * Fire a 1-contract market order via ProjectX (Rithmic)
 */
export async function handleTestTrade(c: Context) {
  const userId = c.get('userId') as string | undefined;

  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const body = await c.req.json<{ accountId: string; symbol: string; side: 'buy' | 'sell' }>();

    if (!body.accountId || !body.symbol || !body.side) {
      return c.json({ error: 'accountId, symbol, and side are required' }, 400);
    }

    const result = await tradingService.fireTestTrade(userId, {
      accountId: body.accountId,
      symbol: body.symbol,
      side: body.side,
    });

    return c.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fire test trade';
    console.error('[Trading] Test trade error:', error);
    return c.json({ error: message }, 500);
  }
}

/**
 * POST /api/trading/toggle-algo
 * Toggle algo trading on/off
 */
export async function handleToggleAlgo(c: Context) {
  const userId = c.get('userId') as string | undefined;

  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const body = await c.req.json<ToggleAlgoRequest>().catch(() => null);

    if (!body || typeof body.enabled !== 'boolean') {
      return c.json({ error: 'enabled field is required' }, 400);
    }

    const result = await tradingService.toggleAlgo(
      userId,
      body.enabled,
      body.strategy
    );

    return c.json(result);
  } catch (error) {
    console.error('[Trading] Toggle algo error:', error);
    return c.json({ error: 'Failed to toggle algo' }, 500);
  }
}
