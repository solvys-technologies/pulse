// [claude-code 2026-03-10] MCP route handlers — list, toggle, health check

import type { Context } from 'hono';
import { getRegistry, getServer, toggleServer } from '../../services/mcp/registry.js';
import type { McpServerId, McpToggleRequest } from '../../types/mcp.js';

export async function handleListServers(c: Context) {
  const registry = await getRegistry();
  return c.json({ servers: registry.servers, lastCheckedAt: registry.lastCheckedAt });
}

export async function handleToggleServer(c: Context) {
  const id = c.req.param('id') as McpServerId;
  let body: McpToggleRequest;
  try {
    body = await c.req.json<McpToggleRequest>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const server = toggleServer(id, body.enabled);
  if (!server) {
    return c.json({ error: `Unknown MCP server: ${id}` }, 404);
  }

  return c.json({ success: true, server });
}

export async function handleCheckHealth(c: Context) {
  const id = c.req.param('id') as McpServerId;
  const server = await getServer(id);
  if (!server) {
    return c.json({ error: `Unknown MCP server: ${id}` }, 404);
  }

  // Health = server is enabled, installed, and has required API key
  const ok = server.installed && (!server.requiresApiKey || server.hasApiKey);
  return c.json({ ok, server: { id: server.id, enabled: server.enabled, installed: server.installed, hasApiKey: server.hasApiKey } });
}
