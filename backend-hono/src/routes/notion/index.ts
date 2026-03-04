// [claude-code 2026-03-03] Phase 3: Notion API routes — NTN brief + schedule
// [claude-code 2026-03-03] Extended: trade-ideas, performance, poll-status endpoints.
import { Hono } from 'hono';
import { fetchNTNBrief, fetchSchedule } from '../../services/notion-service.js';
import { getTradeIdeas, getPerformance, getPollStatus } from './handlers.js';

export function createNotionRoutes(): Hono {
  const app = new Hono();

  // GET /api/notion/ntn-brief
  app.get('/ntn-brief', async (c) => {
    try {
      const items = await fetchNTNBrief();
      return c.json({ items });
    } catch (err) {
      console.error('[Notion] /ntn-brief error:', err);
      return c.json({ items: [] }, 500);
    }
  });

  // GET /api/notion/schedule
  app.get('/schedule', async (c) => {
    try {
      const items = await fetchSchedule();
      return c.json({ items });
    } catch (err) {
      console.error('[Notion] /schedule error:', err);
      return c.json({ items: [] }, 500);
    }
  });

  // GET /api/notion/trade-ideas — live trade ideas from Notion poller cache
  app.get('/trade-ideas', getTradeIdeas);

  // GET /api/notion/performance — KPI data from Daily P&L database
  app.get('/performance', getPerformance);

  // GET /api/notion/poll-status — poller health check
  app.get('/poll-status', getPollStatus);

  return app;
}
