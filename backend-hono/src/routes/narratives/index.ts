// [claude-code 2026-03-06] Narratives API routes — CRUD for market narratives
import { Hono } from 'hono';
import {
  queryNarratives,
  getNarrativeById,
  createNarrative,
  updateNarrative,
  currentWeek,
} from '../../services/narratives-service.js';

export function createNarrativesRoutes(): Hono {
  const app = new Hono();

  // GET /api/narratives?week=2026-W10
  app.get('/', async (c) => {
    try {
      const week = c.req.query('week');
      const narratives = await queryNarratives(week || undefined);
      return c.json({ narratives, week: week || currentWeek() });
    } catch (err) {
      console.error('[Narratives] GET / error:', err);
      return c.json({ narratives: [], week: currentWeek() }, 500);
    }
  });

  // GET /api/narratives/:id
  app.get('/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const narrative = await getNarrativeById(id);
      if (!narrative) {
        return c.json({ error: 'Narrative not found' }, 404);
      }
      return c.json({ narrative });
    } catch (err) {
      console.error('[Narratives] GET /:id error:', err);
      return c.json({ error: 'Internal error' }, 500);
    }
  });

  // POST /api/narratives
  app.post('/', async (c) => {
    try {
      const body = await c.req.json();
      if (!body.title || !body.week) {
        return c.json({ error: 'title and week are required' }, 400);
      }
      const narrative = await createNarrative(body);
      if (!narrative) {
        return c.json({ error: 'Failed to create narrative' }, 500);
      }
      return c.json({ narrative }, 201);
    } catch (err) {
      console.error('[Narratives] POST / error:', err);
      return c.json({ error: 'Internal error' }, 500);
    }
  });

  // PATCH /api/narratives/:id
  app.patch('/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const ok = await updateNarrative(id, body);
      if (!ok) {
        return c.json({ error: 'Failed to update narrative' }, 500);
      }
      const narrative = await getNarrativeById(id);
      return c.json({ narrative });
    } catch (err) {
      console.error('[Narratives] PATCH /:id error:', err);
      return c.json({ error: 'Internal error' }, 500);
    }
  });

  return app;
}
