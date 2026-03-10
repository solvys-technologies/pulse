// [claude-code 2026-03-10] MCP route factory

import { Hono } from 'hono';
import { handleListServers, handleToggleServer, handleCheckHealth } from './handlers.js';

export function createMcpRoutes(): Hono {
  const router = new Hono();
  router.get('/', handleListServers);
  router.patch('/:id/toggle', handleToggleServer);
  router.get('/:id/health', handleCheckHealth);
  return router;
}
