// [claude-code 2026-03-05] Economic Calendar API routes — calendar events, prints, write actuals.

import { Hono } from 'hono';
import {
  fetchEconCalendar,
  fetchEconPrints,
  writeEconPrint,
  updateEventActual,
} from '../../services/econ-calendar-service.js';

export function createEconCalendarRoutes(): Hono {
  const app = new Hono();

  // GET /api/notion/econ-calendar?from=2026-03-01&to=2026-03-07
  app.get('/econ-calendar', async (c) => {
    try {
      const from = c.req.query('from');
      const to = c.req.query('to');
      const events = await fetchEconCalendar({ from, to });
      return c.json({ events, count: events.length });
    } catch (err) {
      console.error('[EconCalendar] /econ-calendar error:', err);
      return c.json({ events: [], count: 0 }, 500);
    }
  });

  // GET /api/notion/econ-prints?event=CPI
  app.get('/econ-prints', async (c) => {
    try {
      const eventName = c.req.query('event');
      const prints = await fetchEconPrints(eventName || undefined);
      return c.json({ prints, count: prints.length });
    } catch (err) {
      console.error('[EconCalendar] /econ-prints error:', err);
      return c.json({ prints: [], count: 0 }, 500);
    }
  });

  // POST /api/notion/econ-print — write an actual print result
  app.post('/econ-print', async (c) => {
    try {
      const body = await c.req.json<{
        eventName: string;
        date: string;
        actual: number;
        forecast?: number;
        previous?: number;
      }>();
      if (!body.eventName || !body.date || body.actual == null) {
        return c.json({ error: 'eventName, date, actual required' }, 400);
      }
      const result = await writeEconPrint(body);
      if (!result) return c.json({ error: 'Failed to write print' }, 500);
      return c.json({ success: true, ...result });
    } catch (err) {
      console.error('[EconCalendar] /econ-print POST error:', err);
      return c.json({ error: 'Internal error' }, 500);
    }
  });

  // PATCH /api/notion/econ-event/:id/actual — update actual on existing event
  app.patch('/econ-event/:id/actual', async (c) => {
    try {
      const id = c.req.param('id');
      const { actual } = await c.req.json<{ actual: string }>();
      if (!actual) return c.json({ error: 'actual required' }, 400);
      const ok = await updateEventActual(id, actual);
      return ok ? c.json({ success: true }) : c.json({ error: 'Update failed' }, 500);
    } catch (err) {
      console.error('[EconCalendar] PATCH econ-event error:', err);
      return c.json({ error: 'Internal error' }, 500);
    }
  });

  return app;
}
