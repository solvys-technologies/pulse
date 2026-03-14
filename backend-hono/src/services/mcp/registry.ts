// [claude-code 2026-03-10] MCP server registry — singleton with runtime env/install checks

import type { McpServerId, McpServerConfig, McpRegistryState } from '../../types/mcp.js';
import { execFileNoThrow } from '../../utils/execFileNoThrow.js';

// Static server definitions
const MCP_SERVER_DEFINITIONS: McpServerConfig[] = [
  {
    id: 'playwright',
    name: 'Playwright',
    description: 'Browser automation, screenshots, page interaction',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@playwright/mcp@latest'],
    env: {},
    enabled: true,
    installed: true,
    requiresApiKey: false,
    hasApiKey: true,
    toolCount: 15,
    category: 'browser',
  },
  {
    id: 'exa',
    name: 'Exa Search',
    description: 'Web search with neural retrieval',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'exa-mcp-server'],
    env: { EXA_API_KEY: '${EXA_API_KEY}' },
    enabled: true,
    installed: true,
    requiresApiKey: true,
    apiKeyEnvVar: 'EXA_API_KEY',
    hasApiKey: false,
    toolCount: 3,
    category: 'search',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Read/write Notion databases and pages',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@notionhq/notion-mcp-server'],
    env: {
      OPENAPI_MCP_HEADERS: '{"Authorization":"Bearer ${NOTION_API_KEY}","Notion-Version":"2022-06-28"}',
    },
    enabled: true,
    installed: true,
    requiresApiKey: true,
    apiKeyEnvVar: 'NOTION_API_KEY',
    hasApiKey: false,
    toolCount: 20,
    category: 'productivity',
  },
  {
    id: 'unusual-whales',
    name: 'Unusual Whales',
    description: 'GEX, put/call walls, options flow, dark pool, congress trades',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'unusualwhales-mcp'],
    env: { UNUSUAL_WHALES_API_KEY: '${UNUSUAL_WHALES_API_KEY}' },
    enabled: false,
    installed: true,
    requiresApiKey: true,
    apiKeyEnvVar: 'UNUSUAL_WHALES_API_KEY',
    hasApiKey: false,
    toolCount: 33,
    category: 'data',
  },
  {
    id: 'yahoo-finance',
    name: 'Yahoo Finance',
    description: 'Free stocks, options, historical data, futures',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@szemeng76/yfinance-mcp-server'],
    env: {},
    enabled: true,
    installed: true,
    requiresApiKey: false,
    hasApiKey: true,
    toolCount: 10,
    category: 'data',
  },
  {
    id: 'twitter-cli',
    name: 'Twitter/X (CLI)',
    description: 'Search tweets, timelines — cookie-based (no API key)',
    transport: 'stdio',
    command: 'twitter',
    args: ['search'],
    env: {},
    enabled: false,
    installed: false,
    requiresApiKey: false,
    hasApiKey: true,
    toolCount: 8,
    category: 'social',
  },
  {
    id: 'alpha-vantage',
    name: 'Alpha Vantage',
    description: 'Commodities, forex, econ indicators',
    transport: 'stdio',
    command: 'uvx',
    args: ['av-mcp'],
    env: { ALPHA_VANTAGE_API_KEY: '${ALPHA_VANTAGE_API_KEY}' },
    enabled: false,
    installed: false,
    requiresApiKey: true,
    apiKeyEnvVar: 'ALPHA_VANTAGE_API_KEY',
    hasApiKey: false,
    toolCount: 25,
    category: 'data',
  },
];

// In-memory toggle state (resets on restart)
const toggleState = new Map<McpServerId, boolean>();

function checkApiKeyPresent(envVar: string): boolean {
  const val = process.env[envVar];
  return typeof val === 'string' && val.trim().length > 0;
}

async function checkInstalled(command: string): Promise<boolean> {
  if (command === 'npx') return true; // npx auto-installs packages
  const result = await execFileNoThrow('which', [command], { timeout: 3000 });
  return result !== null && result.exitCode === 0 && result.stdout.trim().length > 0;
}

async function resolveServer(def: McpServerConfig): Promise<McpServerConfig> {
  const hasApiKey = def.requiresApiKey && def.apiKeyEnvVar
    ? checkApiKeyPresent(def.apiKeyEnvVar)
    : def.hasApiKey;

  const installed = await checkInstalled(def.command);

  const enabled = toggleState.has(def.id)
    ? (toggleState.get(def.id) as boolean)
    : def.enabled;

  return { ...def, hasApiKey, installed, enabled };
}

export async function getRegistry(): Promise<McpRegistryState> {
  const servers = await Promise.all(MCP_SERVER_DEFINITIONS.map(resolveServer));
  return {
    servers,
    lastCheckedAt: new Date().toISOString(),
  };
}

export async function getServer(id: McpServerId): Promise<McpServerConfig | null> {
  const def = MCP_SERVER_DEFINITIONS.find((s) => s.id === id);
  if (!def) return null;
  return resolveServer(def);
}

export function toggleServer(id: McpServerId, enabled: boolean): McpServerConfig | null {
  const def = MCP_SERVER_DEFINITIONS.find((s) => s.id === id);
  if (!def) return null;
  toggleState.set(id, enabled);
  // Return synchronously with current env checks (no install re-check needed for toggle)
  const hasApiKey = def.requiresApiKey && def.apiKeyEnvVar
    ? checkApiKeyPresent(def.apiKeyEnvVar)
    : def.hasApiKey;
  return { ...def, hasApiKey, enabled };
}
