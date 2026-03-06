// [claude-code 2026-03-03] Phase 3: Notion API routes — MDB brief + schedule
// [claude-code 2026-03-03] Extended: trade-ideas, performance, poll-status endpoints.
// [claude-code 2026-03-05] Added econ-calendar sub-routes.
// [claude-code 2026-03-06] Renamed NTN → MDB throughout.
import { Hono } from 'hono';
import { fetchMDBBrief, fetchSchedule } from '../../services/notion-service.js';
import { getTradeIdeas, getPerformance, getPollStatus } from './handlers.js';
import { createEconCalendarRoutes } from './econ-calendar.js';

export function createNotionRoutes(): Hono {
  const app = new Hono();

  // Econ calendar routes (GET /econ-calendar, /econ-prints, POST /econ-print, PATCH /econ-event/:id/actual)
  app.route('/', createEconCalendarRoutes());

  // GET /api/notion/mdb-brief (legacy alias: /ntn-brief)
  app.get('/mdb-brief', async (c) => {
    try {
      const items = await fetchMDBBrief();
      return c.json({ items });
    } catch (err) {
      console.error('[Notion] /mdb-brief error:', err);
      return c.json({ items: [] }, 500);
    }
  });
  app.get('/ntn-brief', async (c) => {
    try {
      const items = await fetchMDBBrief();
      return c.json({ items });
    } catch (err) {
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
