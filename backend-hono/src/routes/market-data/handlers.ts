// [claude-code 2026-03-10] Market-data route handlers — FMP + Unusual Whales
import type { Context } from 'hono';
import { getMarketContext, fmpMarket, unusualWhales } from '../../services/market-data/index.js';

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
