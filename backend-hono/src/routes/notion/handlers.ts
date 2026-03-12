// [claude-code 2026-03-03] Notion route handlers — trade ideas, performance KPIs, poll status.
// [claude-code 2026-03-11] Added updateTradeIdeaStatus — PATCH status on Notion Trade Ideas DB

import type { Context } from 'hono';
import {
  getCachedTradeIdeas,
  getCachedPerformance,
  getNotionPollerStatus,
} from '../../services/notion-poller.js';
import { notionUpdatePage } from '../../services/notion-service.js';

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

/** PATCH /api/notion/trade-ideas/:id/status — update Notion Kanban status (Approved/Denied) */
export async function updateTradeIdeaStatus(c: Context) {
  const pageId = c.req.param('id');
  const body = await c.req.json<{ status: string }>().catch(() => null);
  if (!pageId || !body?.status) {
    return c.json({ error: 'Missing pageId or status' }, 400);
  }

  const validStatuses = ['Proposed', 'Approved', 'Denied', 'Executed', 'Closed'];
  if (!validStatuses.includes(body.status)) {
    return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
  }

  const ok = await notionUpdatePage(pageId, {
    Status: { status: { name: body.status } },
  });

  if (!ok) {
    return c.json({ error: 'Failed to update Notion page' }, 500);
  }

  return c.json({ success: true, pageId, status: body.status });
}
