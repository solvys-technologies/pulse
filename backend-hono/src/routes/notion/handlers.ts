// [claude-code 2026-03-03] Notion route handlers — trade ideas, performance KPIs, poll status.

import type { Context } from 'hono';
import {
  getCachedTradeIdeas,
  getCachedPerformance,
  getNotionPollerStatus,
} from '../../services/notion-poller.js';

export async function getTradeIdeas(c: Context) {
  const ideas = getCachedTradeIdeas();
  return c.json({ tradeIdeas: ideas, count: ideas.length, fetchedAt: new Date().toISOString() });
}

export async function getPerformance(c: Context) {
  const kpis = getCachedPerformance();
  return c.json({ kpis, count: kpis.length, fetchedAt: new Date().toISOString() });
}

export async function getPollStatus(c: Context) {
  return c.json(getNotionPollerStatus());
}
