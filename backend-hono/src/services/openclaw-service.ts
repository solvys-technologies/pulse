/**
 * OpenClaw Service
 * Agentic backend layer for Priced In Capital (P.I.C.)
 * Orchestrates AI agents: Harper (CAO), PMA-1, PMA-2, Futures Desk, Fundamentals Desk
 *
 * Architecture: OPENCLAW → PULSE UI → H.E's (Human Executives)
 */

import { createOpenAI } from '@ai-sdk/openai'
import type { AiProviderType, AiRequestCost } from '../types/ai-types.js'

// OpenClaw API configuration
// NOTE: We allow OPENCLAW_BASE_URL to be either http://host:port or http://host:port/v1
// and normalize to an OpenAI-compatible baseURL that includes /v1.
const normalizeOpenClawGatewayBaseUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '')
  return trimmed.endsWith('/v1') ? trimmed.slice(0, -3) : trimmed
}

const OPENCLAW_BASE_URL = `${normalizeOpenClawGatewayBaseUrl(
  process.env.OPENCLAW_BASE_URL ?? 'http://localhost:18789'
)}/v1`
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY

// OpenClaw Agent Hierarchy
export type OpenClawAgentRole =
  | 'harper-cao'          // Chief Agentic Officer - Executive level
  | 'pma-1'               // S&P 500 & Crypto Predictions
  | 'pma-2'               // Econ/Politics Predictions
  | 'futures-desk'        // Economic Analyst/Trader
  | 'fundamentals-desk'   // Tech Mega-Cap Analyst

export type OpenClawAgentStatus = 'operational' | 'monitoring' | 'awaiting-approval' | 'hedging' | 'standby' | 'offline'

export interface OpenClawAgent {
  id: string
  role: OpenClawAgentRole
  displayName: string
  status: OpenClawAgentStatus
  lastCheckin: Date
  scope: string
  reportsTo: OpenClawAgentRole | 'human-executives'
}

export interface OpenClawTradeProposal {
  id: string
  sourceAgent: OpenClawAgentRole
  symbol: string
  direction: 'long' | 'short'
  instrument: 'futures' | 'prediction-market'
  platform: 'topstep' | 'kalshi'
  entry: number
  stop: number
  target: number
  rationale: string
  conviction: 'high' | 'medium' | 'low'
  riskReward: number
  strategy: string
  timestamp: Date
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'expired'
  approvedBy?: string
  approvedAt?: Date
}

export interface OpenClawAlert {
  id: string
  type: 'session-open' | 'off-schedule-event' | 'hot-print' | 'black-swan' | 'risk-warning'
  sourceAgent: OpenClawAgentRole
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  detail: string
  symbols?: string[]
  timestamp: Date
  acknowledged: boolean
}

export interface OpenClawDailyReport {
  id: string
  date: string
  pnl: number
  trades: OpenClawTradeProposal[]
  bias: 'bullish' | 'bearish' | 'neutral' | 'selective'
  ntnReport: string // Need-To-Know report
  timestamp: Date
}

export interface OpenClawClientConfig {
  apiKey: string
  baseUrl?: string
  appName?: string
}

export interface OpenClawHeaders {
  Authorization: string
  'X-OpenClaw-App': string
  'Content-Type': string
}

// Agent definitions following P.I.C. hierarchy
const OPENCLAW_AGENTS: Record<OpenClawAgentRole, Omit<OpenClawAgent, 'id' | 'lastCheckin' | 'status'>> = {
  'harper-cao': {
    role: 'harper-cao',
    displayName: 'Harper / CAO',
    scope: 'Macro oversight, approvals, trade consolidation',
    reportsTo: 'human-executives'
  },
  'pma-1': {
    role: 'pma-1',
    displayName: 'PMA-1 (S&P/Crypto)',
    scope: 'S&P 500 & Crypto prediction markets',
    reportsTo: 'harper-cao'
  },
  'pma-2': {
    role: 'pma-2',
    displayName: 'PMA-2 (Econ/Politics)',
    scope: 'Economic & Political prediction markets',
    reportsTo: 'harper-cao'
  },
  'futures-desk': {
    role: 'futures-desk',
    displayName: 'Futures Desk',
    scope: '/NQ, /MNQ, /ES trading via TopStepX',
    reportsTo: 'harper-cao'
  },
  'fundamentals-desk': {
    role: 'fundamentals-desk',
    displayName: 'Fundamentals Desk',
    scope: 'Top 10 S&P/NDX tech watchlist',
    reportsTo: 'harper-cao'
  }
}

// Agent-to-Model mapping for OpenClaw tasks
export const OPENCLAW_TASK_MODEL_MAP: Record<string, string> = {
  // CAO uses reasoning-capable models for executive decisions
  'harper-cao': 'openrouter-opus',
  'cao-approval': 'openrouter-opus',
  'cao-consolidation': 'openrouter-sonnet',

  // PMA agents use fast models for prediction market analysis
  'pma-1': 'openrouter-grok',
  'pma-2': 'openrouter-grok',
  'prediction-market': 'openrouter-grok',

  // Futures desk uses technical analysis models
  'futures-desk': 'openrouter-llama',
  'fa-rippers': 'openrouter-llama',
  'economic-analysis': 'openrouter-grok',

  // Fundamentals desk uses research-grade models
  'fundamentals-desk': 'openrouter-opus',
  'earnings-analysis': 'openrouter-opus',
  'tech-mega-cap': 'openrouter-sonnet'
}

/**
 * Build headers required by OpenClaw API
 */
export const buildOpenClawHeaders = (config?: { appName?: string }): Partial<OpenClawHeaders> => {
  const appName = config?.appName ?? process.env.OPENCLAW_APP_NAME ?? 'Pulse-PIC-Gateway'

  return {
    'X-OpenClaw-App': appName,
    'Content-Type': 'application/json'
  }
}

/**
 * Check if OpenClaw is available
 */
export const isOpenClawAvailable = (): boolean => {
  return Boolean(OPENCLAW_API_KEY && OPENCLAW_API_KEY.length > 0)
}

/**
 * Create an OpenClaw client using OpenAI-compatible interface
 * OpenClaw implements OpenAI API spec for model access
 */
export const createOpenClawClient = (modelId?: string) => {
  if (!OPENCLAW_API_KEY) {
    throw new Error('Missing OPENCLAW_API_KEY environment variable')
  }

  const headers = buildOpenClawHeaders()

  // Create OpenAI-compatible client pointing to OpenClaw
  const openclaw = createOpenAI({
    apiKey: OPENCLAW_API_KEY,
    baseURL: OPENCLAW_BASE_URL,
    headers: headers as Record<string, string>
  })

  // Default model for OpenClaw is claude-opus for CAO-level reasoning
  return openclaw(modelId ?? 'anthropic/claude-opus-4')
}

/**
 * Get agent definition by role
 */
export const getAgentDefinition = (role: OpenClawAgentRole): Omit<OpenClawAgent, 'id' | 'lastCheckin' | 'status'> => {
  return OPENCLAW_AGENTS[role]
}

/**
 * Get all agent definitions
 */
export const getAllAgentDefinitions = (): typeof OPENCLAW_AGENTS => {
  return OPENCLAW_AGENTS
}

/**
 * Get the recommended model for an OpenClaw task
 */
export const getModelForTask = (task: string): string | undefined => {
  const normalizedTask = task.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  return OPENCLAW_TASK_MODEL_MAP[normalizedTask]
}

/**
 * Map OpenClaw agent role to AI task type for model selection
 */
export const agentRoleToTaskType = (role: OpenClawAgentRole): string => {
  switch (role) {
    case 'harper-cao':
      return 'reasoning' // Uses Opus for complex decisions
    case 'pma-1':
    case 'pma-2':
      return 'prediction-market' // Uses Grok for real-time
    case 'futures-desk':
      return 'technical' // Uses Llama for speed
    case 'fundamentals-desk':
      return 'research' // Uses Opus for deep analysis
    default:
      return 'general'
  }
}

/**
 * Calculate cost from token usage for OpenClaw requests
 */
export const calculateOpenClawCost = (
  usage: { inputTokens?: number; outputTokens?: number },
  model: string
): AiRequestCost => {
  const inputTokens = usage.inputTokens ?? 0
  const outputTokens = usage.outputTokens ?? 0
  const totalTokens = inputTokens + outputTokens

  // OpenClaw pricing (via OpenRouter passthrough)
  const pricing: Record<string, { input: number; output: number }> = {
    'anthropic/claude-opus-4': { input: 0.015, output: 0.075 },
    'anthropic/claude-sonnet-4': { input: 0.003, output: 0.015 },
    'x-ai/grok-4': { input: 0.003, output: 0.015 },
    'meta-llama/llama-3.3-70b-instruct': { input: 0.00012, output: 0.0003 }
  }

  const modelPricing = pricing[model] ?? { input: 0.003, output: 0.015 }

  const inputCostUsd = (inputTokens / 1000) * modelPricing.input
  const outputCostUsd = (outputTokens / 1000) * modelPricing.output
  const totalCostUsd = inputCostUsd + outputCostUsd

  return {
    provider: 'openclaw' as AiProviderType,
    model,
    inputTokens,
    outputTokens,
    totalTokens,
    inputCostUsd,
    outputCostUsd,
    totalCostUsd,
    timestamp: new Date().toISOString()
  }
}

/**
 * Check if an error is an OpenClaw rate limit error
 */
export const isOpenClawRateLimitError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false

  const status =
    (error as { status?: number }).status ?? (error as { statusCode?: number }).statusCode
  if (status === 429) return true

  const message = 'message' in error ? String((error as { message?: string }).message) : ''
  return (
    message.toLowerCase().includes('rate limit') ||
    message.toLowerCase().includes('too many requests')
  )
}

/**
 * Check if an error is retryable
 */
export const isOpenClawRetryableError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false

  if (isOpenClawRateLimitError(error)) return true

  const status =
    (error as { status?: number }).status ?? (error as { statusCode?: number }).statusCode ?? null

  if (status && [408, 500, 502, 503, 504].includes(status)) {
    return true
  }

  const message = 'message' in error ? String((error as { message?: string }).message).toLowerCase() : ''
  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('connection')
  )
}

/**
 * P.I.C. Trading Rules validation
 * Validates proposals against the 13 Commandments
 */
export const validateTradeProposal = (proposal: Partial<OpenClawTradeProposal>): {
  valid: boolean
  violations: string[]
} => {
  const violations: string[] = []

  // Rule 3: No "shot in the dark" trades — conviction required
  if (!proposal.conviction || proposal.conviction === 'low') {
    violations.push('Rule 3: No "shot in the dark" trades - conviction must be medium or high')
  }

  // Rule 8: Good traders buy from good prices
  if (proposal.riskReward && proposal.riskReward < 2) {
    violations.push('Rule 8: Risk/reward must be at least 2:1 for good trade entries')
  }

  // Check stop is defined (Rule 12: Be right or be right out)
  if (!proposal.stop) {
    violations.push('Rule 12: Stop loss must be defined - no painful endings')
  }

  return {
    valid: violations.length === 0,
    violations
  }
}

/**
 * OpenClaw model IDs used by P.I.C.
 */
export const OPENCLAW_MODELS = {
  // Primary models via OpenClaw
  CAO_REASONING: 'anthropic/claude-opus-4',
  FAST_ANALYSIS: 'meta-llama/llama-3.3-70b-instruct',
  NEWS_REALTIME: 'x-ai/grok-4',
  RESEARCH: 'anthropic/claude-sonnet-4'
} as const

export type OpenClawModelId = (typeof OPENCLAW_MODELS)[keyof typeof OPENCLAW_MODELS]
