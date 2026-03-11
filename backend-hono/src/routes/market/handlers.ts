// [claude-code 2026-03-09] Added IV scoring replay endpoint for config testing
/**
 * Market Handlers
 * Request handlers for market data endpoints
 */

import type { Context } from 'hono';
import * as marketService from '../../services/market-service.js';
import { calculateIVScoreV2, type IVScoringConfig, type StackedEvent } from '../../services/iv-scoring-v2.js';

/**
 * GET /api/market/vix
 * Get current VIX value
 */
export async function handleGetVix(c: Context) {
  try {
    const vixData = await marketService.getVix();
    return c.json(vixData);
  } catch (error) {
    console.error('[Market] VIX fetch error:', error);
    // If missing API key or upstream failure, return 503 so frontend doesn't trust mock data
    return c.json({ error: 'Failed to fetch VIX data (upstream unavailable)' }, 503);
  }
}

/**
 * POST /api/iv-scoring/replay
 * Replay IV scoring with historical events and optional config overrides.
 * Allows testing different config values without deploying.
 */
export async function handleIVScoringReplay(c: Context) {
  try {
    const body = await c.req.json();

    const events: StackedEvent[] = (body.events ?? []).map((e: any) => ({
      eventType: e.eventType ?? 'other',
      baseScore: e.baseScore ?? 3,
      timestamp: new Date(e.timestamp ?? Date.now()),
    }));

    const input = {
      events,
      vixLevel: body.vixLevel ?? 20,
      previousVixLevel: body.previousVixLevel,
      vixUpdateMinutes: body.vixUpdateMinutes,
      currentPrice: body.currentPrice ?? 6000,
      instrument: body.instrument ?? '/ES',
      isMarketClosed: body.isMarketClosed ?? false,
      isEarningsSeason: body.isEarningsSeason ?? false,
      isFOMCWeek: body.isFOMCWeek ?? false,
      previousSessionScore: body.previousSessionScore ?? 0,
    };

    const configOverrides: Partial<IVScoringConfig> | undefined = body.config ?? undefined;

    const result = calculateIVScoreV2(input, configOverrides);
    return c.json(result);
  } catch (error) {
    console.error('[IV Replay] Error:', error);
    return c.json({ error: 'Invalid replay request' }, 400);
  }
}

/**
 * GET /api/market/quotes/:symbol
 * Get quote for a specific symbol (placeholder for future)
 */
export async function handleGetQuote(c: Context) {
  const symbol = c.req.param('symbol');

  if (!symbol) {
    return c.json({ error: 'Symbol is required' }, 400);
  }

  try {
    const quote = await marketService.getQuote(symbol.toUpperCase());
    return c.json(quote);
  } catch (error) {
    console.error('[Market] Quote fetch error:', error);
    return c.json({ error: 'Failed to fetch quote' }, 500);
  }
}
