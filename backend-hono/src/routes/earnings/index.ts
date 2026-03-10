// [claude-code 2026-03-09] Earnings Review routes — CRUD + agent retrieval + DB setup
import { Hono } from 'hono';
import {
  handleListEarnings,
  handleGetEarning,
  handleCreateEarning,
  handleUpdateEarning,
  handleDeleteEarning,
  handleAgentRetrieve,
  handleSetup,
} from './handlers.js';

export function createEarningsRoutes(): Hono {
  const router = new Hono();

  // CRUD
  router.get('/', handleListEarnings);
  router.get('/:id', handleGetEarning);
  router.post('/', handleCreateEarning);
  router.patch('/:id', handleUpdateEarning);
  router.delete('/:id', handleDeleteEarning);

  // Agent retrieval (psych analysis context)
  router.post('/agent-retrieve', handleAgentRetrieve);

  // One-time setup: auto-create Notion DB
  router.post('/setup', handleSetup);

  return router;
}
