// [claude-code 2026-03-13] Hermes migration — replaced OpenClaw gateway with Groq direct + Hermes Agent
/**
 * Hermes Service
 * Agentic backend layer for Priced In Capital (P.I.C.)
 * Orchestrates AI agents: Harper (CAO), PMA-1, PMA-2, Futures Desk, Fundamentals Desk
 *
 * Architecture: HERMES AGENT → PULSE UI → H.E's (Human Executives)
 * Inference: Groq API direct (free tier) — no gateway middleman
 */

import { createOpenAI } from '@ai-sdk/openai'
import type { AiProviderType, AiRequestCost } from '../types/ai-types.js'

// Hermes / Groq API configuration
// Calls Groq directly — no gateway middleman
const normalizeBaseUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '')
  return trimmed.endsWith('/v1') ? trimmed.slice(0, -3) : trimmed
}

const HERMES_BASE_URL = `${normalizeBaseUrl(
  process.env.HERMES_BASE_URL ?? 'https://api.groq.com/openai/v1'
)}/v1`
const HERMES_API_KEY = process.env.HERMES_API_KEY

// P.I.C. Agent Hierarchy
export type HermesAgentRole =
  | 'harper-cao'          // Chief Agentic Officer - Executive level
  | 'pma-1'               // S&P 500 & Crypto Predictions
  | 'pma-2'               // Econ/Politics Predictions
  | 'futures-desk'        // Economic Analyst/Trader
  | 'fundamentals-desk'   // Tech Mega-Cap Analyst

// Backward compat alias
export type OpenClawAgentRole = HermesAgentRole

export type HermesAgentStatus = 'operational' | 'monitoring' | 'awaiting-approval' | 'hedging' | 'standby' | 'offline'

export interface HermesAgent {
  id: string
  role: HermesAgentRole
  displayName: string
  status: HermesAgentStatus
  lastCheckin: Date
  scope: string
  reportsTo: HermesAgentRole | 'human-executives'
}

export interface HermesTradeProposal {
  id: string
  sourceAgent: HermesAgentRole
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

export interface HermesAlert {
  id: string
  type: 'session-open' | 'off-schedule-event' | 'hot-print' | 'black-swan' | 'risk-warning'
  sourceAgent: HermesAgentRole
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  detail: string
  symbols?: string[]
  timestamp: Date
  acknowledged: boolean
}

export interface HermesDailyReport {
  id: string
  date: string
  pnl: number
  trades: HermesTradeProposal[]
  bias: 'bullish' | 'bearish' | 'neutral' | 'selective'
  mdbReport: string // Morning Daily Brief report
  timestamp: Date
}

export interface HermesClientConfig {
  apiKey: string
  baseUrl?: string
  appName?: string
}

// Agent definitions following P.I.C. hierarchy
const HERMES_AGENTS: Record<HermesAgentRole, Omit<HermesAgent, 'id' | 'lastCheckin' | 'status'>> = {
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

// [claude-code 2026-03-13] Groq direct — optimal model per task (free tier)
// Scout (30K TPM, 500K TPD) = fast/realtime, Maverick (128E MoE, 500K TPD) = research,
// Kimi K2 (10K TPM, 300K TPD) = reasoning/CAO, Qwen3 (reasoning mode) = backup
export const HERMES_TASK_MODEL_MAP: Record<string, string> = {
  // CAO uses Kimi K2 for executive reasoning
  'harper-cao': 'moonshotai/kimi-k2-instruct',
  'cao-approval': 'moonshotai/kimi-k2-instruct',
  'cao-consolidation': 'meta-llama/llama-4-maverick-17b-128e-instruct',

  // PMA agents use Scout for fast prediction market analysis
  'pma-1': 'meta-llama/llama-4-scout-17b-16e-instruct',
  'pma-2': 'meta-llama/llama-4-scout-17b-16e-instruct',
  'prediction-market': 'meta-llama/llama-4-scout-17b-16e-instruct',

  // Futures desk uses Scout for fast technical analysis
  'futures-desk': 'meta-llama/llama-4-scout-17b-16e-instruct',
  'fa-rippers': 'meta-llama/llama-4-scout-17b-16e-instruct',
  'economic-analysis': 'meta-llama/llama-4-scout-17b-16e-instruct',

  // Fundamentals desk uses Maverick 128E for deep research
  'fundamentals-desk': 'meta-llama/llama-4-maverick-17b-128e-instruct',
  'earnings-analysis': 'meta-llama/llama-4-maverick-17b-128e-instruct',
  'tech-mega-cap': 'meta-llama/llama-4-maverick-17b-128e-instruct'
}

// Backward compat
export const OPENCLAW_TASK_MODEL_MAP = HERMES_TASK_MODEL_MAP

/**
 * Build headers for Groq API calls
 */
export const buildHermesHeaders = (config?: {
  appName?: string
}): Record<string, string> => {
  const appName = config?.appName ?? process.env.HERMES_APP_NAME ?? 'Pulse-PIC-Hermes'

  return {
    'X-Hermes-App': appName,
    'Content-Type': 'application/json',
  }
}

// Backward compat
export const buildOpenClawHeaders = buildHermesHeaders

/**
 * Check if Hermes / Groq is available
 */
export const isHermesAvailable = (): boolean => {
  return Boolean(HERMES_API_KEY && HERMES_API_KEY.length > 0)
}

// Backward compat
export const isOpenClawAvailable = isHermesAvailable

/**
 * Create a Hermes client using OpenAI-compatible interface
 * Calls Groq API directly (no gateway)
 */
export const createHermesClient = (modelId?: string) => {
  if (!HERMES_API_KEY) {
    throw new Error('Missing HERMES_API_KEY environment variable')
  }

  const headers = buildHermesHeaders()

  const hermes = createOpenAI({
    apiKey: HERMES_API_KEY,
    baseURL: HERMES_BASE_URL,
    headers: headers as Record<string, string>
  })

  // Default model: Scout (highest throughput — 30K TPM, 500K TPD)
  return hermes(modelId ?? 'meta-llama/llama-4-scout-17b-16e-instruct')
}

// Backward compat
export const createOpenClawClient = createHermesClient

/**
 * Get agent definition by role
 */
export const getAgentDefinition = (role: HermesAgentRole): Omit<HermesAgent, 'id' | 'lastCheckin' | 'status'> => {
  return HERMES_AGENTS[role]
}

/**
 * Get all agent definitions
 */
export const getAllAgentDefinitions = (): typeof HERMES_AGENTS => {
  return HERMES_AGENTS
}

/**
 * Get the recommended model for a task
 */
export const getModelForTask = (task: string): string | undefined => {
  const normalizedTask = task.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  return HERMES_TASK_MODEL_MAP[normalizedTask]
}

/**
 * Map agent role to AI task type for model selection
 */
export const agentRoleToTaskType = (role: HermesAgentRole): string => {
  switch (role) {
    case 'harper-cao':
      return 'reasoning'
    case 'pma-1':
    case 'pma-2':
      return 'prediction-market'
    case 'futures-desk':
      return 'technical'
    case 'fundamentals-desk':
      return 'research'
    default:
      return 'general'
  }
}

/**
 * Calculate cost from token usage (Groq free tier — $0)
 */
export const calculateHermesCost = (
  usage: { inputTokens?: number; outputTokens?: number },
  model: string
): AiRequestCost => {
  const inputTokens = usage.inputTokens ?? 0
  const outputTokens = usage.outputTokens ?? 0
  const totalTokens = inputTokens + outputTokens

  // Groq free tier — all $0
  const pricing: Record<string, { input: number; output: number }> = {
    'meta-llama/llama-4-scout-17b-16e-instruct': { input: 0, output: 0 },
    'meta-llama/llama-4-maverick-17b-128e-instruct': { input: 0, output: 0 },
    'moonshotai/kimi-k2-instruct': { input: 0, output: 0 },
    'qwen/qwen3-32b': { input: 0, output: 0 }
  }

  const modelPricing = pricing[model] ?? { input: 0.003, output: 0.015 }

  const inputCostUsd = (inputTokens / 1000) * modelPricing.input
  const outputCostUsd = (outputTokens / 1000) * modelPricing.output
  const totalCostUsd = inputCostUsd + outputCostUsd

  return {
    provider: 'hermes' as AiProviderType,
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

// Backward compat
export const calculateOpenClawCost = calculateHermesCost

/**
 * Check if an error is a rate limit error
 */
export const isHermesRateLimitError = (error: unknown): boolean => {
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

// Backward compat
export const isOpenClawRateLimitError = isHermesRateLimitError

/**
 * Check if an error is retryable
 */
export const isHermesRetryableError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false

  if (isHermesRateLimitError(error)) return true

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

// Backward compat
export const isOpenClawRetryableError = isHermesRetryableError

/**
 * P.I.C. Trading Rules validation
 * Validates proposals against the 13 Commandments
 */
export const validateTradeProposal = (proposal: Partial<HermesTradeProposal>): {
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
 * Hermes model IDs used by P.I.C. (Groq direct, no prefix)
 */
export const HERMES_MODELS = {
  // [claude-code 2026-03-13] Task-optimized Groq models direct (free tier)
  CAO_REASONING: 'moonshotai/kimi-k2-instruct',
  FAST_ANALYSIS: 'meta-llama/llama-4-scout-17b-16e-instruct',
  NEWS_REALTIME: 'meta-llama/llama-4-scout-17b-16e-instruct',
  RESEARCH: 'meta-llama/llama-4-maverick-17b-128e-instruct'
} as const

// Backward compat
export const OPENCLAW_MODELS = HERMES_MODELS

export type HermesModelId = (typeof HERMES_MODELS)[keyof typeof HERMES_MODELS]
