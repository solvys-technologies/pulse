// [claude-code 2026-03-11] Market-data route handlers — FMP + Unusual Whales + blended IV score
import type { Context } from 'hono';
import { getMarketContext, fmpMarket, unusualWhales } from '../../services/market-data/index.js';
import { calculateBlendedIVScore, classifyEventType } from '../../services/market-data/iv-scorer.js';
import { estimatePoints } from '../../services/market-data/point-estimator.js';
import type { StackedEvent } from '../../services/iv-scoring-v2.js';

export async function handleQuote(c: Context) {
  const symbol = c.req.param('symbol');
  if (!symbol) return c.json({ error: 'Symbol is required' }, 400);
  try {
    const quote = await fmpMarket.getQuote(symbol.toUpperCase());
    return c.json(quote);
  } catch (err: any) {
    console.error('[market-data] quote error:', err.message);
    return c.json({ error: err.message ?? 'Failed to fetch quote' }, err.status ?? 500);
  }
}

export async function handleVix(c: Context) {
  try {
    const vix = await fmpMarket.getVix();
    return c.json(vix);
  } catch (err: any) {
    console.error('[market-data] VIX error:', err.message);
    return c.json({ error: err.message ?? 'Failed to fetch VIX' }, err.status ?? 503);
  }
}

export async function handleGex(c: Context) {
  if (!unusualWhales.isAvailable()) {
    return c.json({ error: 'Unusual Whales API key not configured' }, 503);
  }
  const symbol = c.req.param('symbol');
  if (!symbol) return c.json({ error: 'Symbol is required' }, 400);
  try {
    const gex = await unusualWhales.getGammaExposure(symbol.toUpperCase());
    return c.json(gex);
  } catch (err: any) {
    console.error('[market-data] GEX error:', err.message);
    return c.json({ error: err.message ?? 'Failed to fetch GEX' }, err.status ?? 500);
  }
}

export async function handleWalls(c: Context) {
  if (!unusualWhales.isAvailable()) {
    return c.json({ error: 'Unusual Whales API key not configured' }, 503);
  }
  const symbol = c.req.param('symbol');
  if (!symbol) return c.json({ error: 'Symbol is required' }, 400);
  try {
    const walls = await unusualWhales.getOptionsWalls(symbol.toUpperCase());
    return c.json(walls);
  } catch (err: any) {
    console.error('[market-data] walls error:', err.message);
    return c.json({ error: err.message ?? 'Failed to fetch option walls' }, err.status ?? 500);
  }
}

export async function handleFlow(c: Context) {
  if (!unusualWhales.isAvailable()) {
    return c.json({ error: 'Unusual Whales API key not configured' }, 503);
  }
  const symbol = c.req.param('symbol');
  if (!symbol) return c.json({ error: 'Symbol is required' }, 400);
  const limit = parseInt(c.req.query('limit') ?? '50', 10);
  try {
    const flow = await unusualWhales.getOptionsFlow(symbol.toUpperCase(), { limit });
    return c.json(flow);
  } catch (err: any) {
    console.error('[market-data] flow error:', err.message);
    return c.json({ error: err.message ?? 'Failed to fetch options flow' }, err.status ?? 500);
  }
}

export async function handleContext(c: Context) {
  const symbol = c.req.param('symbol');
  if (!symbol) return c.json({ error: 'Symbol is required' }, 400);
  try {
    const context = await getMarketContext(symbol.toUpperCase());
    return c.json(context);
  } catch (err: any) {
    console.error('[market-data] context error:', err.message);
    return c.json({ error: err.message ?? 'Failed to fetch market context' }, 500);
  }
}

/** GET /api/market-data/iv-score — blended 60/40 VIX+headline IV score */
export async function handleIVScore(c: Context) {
  try {
    const instrument = c.req.query('instrument') || '/ES';
    const priceParam = c.req.query('price');
    const currentPrice = priceParam ? parseFloat(priceParam) : undefined;

    // Pull recent headline events from DB (last 2 hours, macroLevel >= 2)
    let events: StackedEvent[] = [];
    try {
      const { sql, isDatabaseAvailable } = await import('../../config/database.js');
      if (isDatabaseAvailable() && sql) {
        const recentItems = await sql`
          SELECT headline, source, macro_level, iv_score, published_at, is_breaking
          FROM news_feed_items
          WHERE published_at >= NOW() - INTERVAL '2 hours'
            AND macro_level >= 2
          ORDER BY published_at DESC
          LIMIT 20
        `;
        events = recentItems.map((item: any) => {
          const parsed = { raw: item.headline, eventType: null, isBreaking: item.is_breaking };
          return {
            eventType: classifyEventType(parsed as any),
            baseScore: item.iv_score || 3,
            timestamp: new Date(item.published_at),
          };
        });
      }
    } catch {
      // DB unavailable — proceed with VIX-only score
    }

    const result = await calculateBlendedIVScore(events, instrument, currentPrice);
    const pointEst = estimatePoints(result.score, result.vix.level, instrument, currentPrice);

    return c.json({
      ...result,
      points: {
        scaledPoints: pointEst.scaledPoints,
        scaledTicks: pointEst.scaledTicks,
        scaledDollarRisk: pointEst.scaledDollarRisk,
        urgency: pointEst.urgency,
        implied: pointEst.implied,
      },
      instrument,
    });
  } catch (err) {
    console.error('[market-data] iv-score error:', err);
    return c.json({ error: err instanceof Error ? err.message : 'Failed to calculate IV score' }, 500);
  }
}
