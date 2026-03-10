// [claude-code 2026-03-09] Earnings Review route handlers — CRUD + agent retrieval + setup
import type { Context } from 'hono';
import { getERStoreAdapter } from '../../services/earnings-history/index.js';
import type {
  EarningsHistoryFilter,
  EarningsReviewCreate,
  EarningsReviewUpdate,
  EarningsContextRequest,
} from '../../types/earnings-history.js';

export async function handleListEarnings(c: Context) {
  const adapter = getERStoreAdapter();
  const filter: EarningsHistoryFilter = {
    symbol: c.req.query('symbol') || undefined,
    setupType: c.req.query('setupType') || undefined,
    dateFrom: c.req.query('dateFrom') || undefined,
    dateTo: c.req.query('dateTo') || undefined,
    grade: c.req.query('grade') || undefined,
    direction: c.req.query('direction') || undefined,
    limit: c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined,
    offset: c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : undefined,
  };

  const result = await adapter.list(filter);
  return c.json(result);
}

export async function handleGetEarning(c: Context) {
  const id = c.req.param('id');
  const adapter = getERStoreAdapter();
  const review = await adapter.getById(id);
  if (!review) return c.json({ error: 'Not found' }, 404);
  return c.json(review);
}

export async function handleCreateEarning(c: Context) {
  const adapter = getERStoreAdapter();
  const body = await c.req.json<EarningsReviewCreate>();

  if (!body.symbol || !body.earningsDate || !body.setupType || !body.direction || !body.thesis) {
    return c.json({ error: 'Missing required fields: symbol, earningsDate, setupType, direction, thesis' }, 400);
  }

  try {
    const review = await adapter.create(body);
    return c.json(review, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
}

export async function handleUpdateEarning(c: Context) {
  const id = c.req.param('id');
  const adapter = getERStoreAdapter();
  const body = await c.req.json<EarningsReviewUpdate>();

  const review = await adapter.update(id, body);
  if (!review) return c.json({ error: 'Not found or update failed' }, 404);
  return c.json(review);
}

export async function handleDeleteEarning(c: Context) {
  const id = c.req.param('id');
  const adapter = getERStoreAdapter();
  const ok = await adapter.delete(id);
  if (!ok) return c.json({ error: 'Not found or delete failed' }, 404);
  return c.json({ success: true });
}

export async function handleAgentRetrieve(c: Context) {
  const adapter = getERStoreAdapter();
  const body = await c.req.json<EarningsContextRequest>();
  const maxTokens = body.maxTokens ?? 2000;
  const limit = body.limit ?? 5;

  const reviews = await adapter.searchByRelevance(body.query ?? '', body.symbol, limit);

  // Token budget enforcement (rough: chars/4)
  let tokenEstimate = 0;
  const budgeted: typeof reviews = [];
  let truncated = false;

  for (const review of reviews) {
    const reviewTokens = Math.ceil(JSON.stringify(review).length / 4);
    if (tokenEstimate + reviewTokens > maxTokens && budgeted.length > 0) {
      truncated = true;
      break;
    }
    budgeted.push(review);
    tokenEstimate += reviewTokens;
  }

  return c.json({
    reviews: budgeted,
    totalMatched: reviews.length,
    tokenEstimate,
    truncated,
  });
}

export async function handleSetup(c: Context) {
  const adapter = getERStoreAdapter();
  try {
    const dbId = await adapter.ensureDatabase();
    return c.json({ success: true, dbId });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
}
