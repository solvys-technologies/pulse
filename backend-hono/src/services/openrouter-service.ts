// [claude-code 2026-03-11] OpenRouter Service — replaces OpenClaw for Windows cross-platform
/**
 * OpenRouter Service
 * Agentic backend layer for Priced In Capital (P.I.C.)
 * Routes all AI through OpenRouter (cloud-hosted, OpenAI-compatible)
 * Default model: Claude Opus 4.6
 *
 * Architecture: OPENROUTER → PULSE UI → H.E's (Human Executives)
 */

import { createOpenAI } from '@ai-sdk/openai'
import type { AiProviderType, AiRequestCost } from '../types/ai-types.js'

// OpenRouter API configuration
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// P.I.C. Agent Hierarchy
export type PICAgentRole =
  | 'harper-cao'          // Chief Agentic Officer - Executive level
  | 'pma-1'               // S&P 500 & Crypto Predictions
  | 'pma-2'               // Econ/Politics Predictions
  | 'futures-desk'        // Economic Analyst/Trader
  | 'fundamentals-desk'   // Tech Mega-Cap Analyst

// Backward compat alias (imported by other files as OpenClawAgentRole)
export type OpenClawAgentRole = PICAgentRole

export type PICAgentStatus = 'operational' | 'monitoring' | 'awaiting-approval' | 'hedging' | 'standby' | 'offline'

export interface PICAgent {
  id: string
  role: PICAgentRole
  displayName: string
  status: PICAgentStatus
  lastCheckin: Date
  scope: string
  reportsTo: PICAgentRole | 'human-executives'
}

export interface PICTradeProposal {
  id: string
  sourceAgent: PICAgentRole
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

export type OpenClawTradeProposal = PICTradeProposal

export interface PICAlert {
  id: string
  type: 'session-open' | 'off-schedule-event' | 'hot-print' | 'black-swan' | 'risk-warning'
  sourceAgent: PICAgentRole
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  detail: string
  symbols?: string[]
  timestamp: Date
  acknowledged: boolean
}

export type OpenClawAlert = PICAlert

export interface PICDailyReport {
  id: string
  date: string
  pnl: number
  trades: PICTradeProposal[]
  bias: 'bullish' | 'bearish' | 'neutral' | 'selective'
  mdbReport: string
  timestamp: Date
}

export type OpenClawDailyReport = PICDailyReport

// Agent definitions following P.I.C. hierarchy
const PIC_AGENTS: Record<PICAgentRole, Omit<PICAgent, 'id' | 'lastCheckin' | 'status'>> = {
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

// All agents use Claude Opus 4.6 via OpenRouter
export const OPENROUTER_MODEL_MAP: Record<string, string> = {
  primary: 'anthropic/claude-opus-4-6',
  fallback: 'anthropic/claude-sonnet-4-6',
  'last-resort': 'anthropic/claude-haiku-4-5-20251001',
  'harper-cao': 'anthropic/claude-opus-4-6',
  'cao-approval': 'anthropic/claude-opus-4-6',
  'cao-consolidation': 'anthropic/claude-opus-4-6',
  'pma-1': 'anthropic/claude-opus-4-6',
  'pma-2': 'anthropic/claude-opus-4-6',
  'prediction-market': 'anthropic/claude-opus-4-6',
  'futures-desk': 'anthropic/claude-opus-4-6',
  'fa-rippers': 'anthropic/claude-opus-4-6',
  'economic-analysis': 'anthropic/claude-opus-4-6',
  'fundamentals-desk': 'anthropic/claude-opus-4-6',
  'earnings-analysis': 'anthropic/claude-opus-4-6',
  'tech-mega-cap': 'anthropic/claude-opus-4-6',
}

/**
 * Check if OpenRouter is available
 */
export const isOpenRouterAvailable = (): boolean => {
  return Boolean(OPENROUTER_API_KEY && OPENROUTER_API_KEY.length > 0)
}

// Backward compat
export const isOpenClawAvailable = isOpenRouterAvailable

/**
 * Create an OpenRouter client using OpenAI-compatible interface
 * Default model: Claude Opus 4.6
 */
export const createOpenRouterClient = (modelId?: string) => {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Missing OPENROUTER_API_KEY environment variable')
  }

  const client = createOpenAI({
    apiKey: OPENROUTER_API_KEY,
    baseURL: OPENROUTER_BASE_URL,
    headers: {
      'HTTP-Referer': process.env.OPENROUTER_APP_URL ?? 'https://pulse-solvys.vercel.app',
      'X-Title': process.env.OPENROUTER_APP_NAME ?? 'Pulse-PIC-Gateway',
    },
  })

  return client(modelId ?? 'anthropic/claude-opus-4-6')
}

// Backward compat
export const createOpenClawClient = createOpenRouterClient

/**
 * Get agent definition by role
 */
export const getAgentDefinition = (role: PICAgentRole): Omit<PICAgent, 'id' | 'lastCheckin' | 'status'> => {
  return PIC_AGENTS[role]
}

/**
 * Get all agent definitions
 */
export const getAllAgentDefinitions = (): typeof PIC_AGENTS => {
  return PIC_AGENTS
}

/**
 * Get the recommended model for a task (always Claude Opus 4.6)
 */
export const getModelForTask = (task: string): string => {
  const normalizedTask = task.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  return OPENROUTER_MODEL_MAP[normalizedTask] ?? 'anthropic/claude-opus-4-6'
}

/**
 * Map agent role to AI task type for model selection
 */
export const agentRoleToTaskType = (role: PICAgentRole): string => {
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
 * Calculate cost from token usage for OpenRouter requests
 */
export const calculateOpenRouterCost = (
  usage: { inputTokens?: number; outputTokens?: number },
  model: string
): AiRequestCost => {
  const inputTokens = usage.inputTokens ?? 0
  const outputTokens = usage.outputTokens ?? 0
  const totalTokens = inputTokens + outputTokens

  const pricing: Record<string, { input: number; output: number }> = {
    'anthropic/claude-opus-4-6': { input: 0.015, output: 0.075 },
    'anthropic/claude-sonnet-4-6': { input: 0.003, output: 0.015 },
    'anthropic/claude-haiku-4-5-20251001': { input: 0.0008, output: 0.004 },
  }

  const modelPricing = pricing[model] ?? { input: 0.015, output: 0.075 }

  const inputCostUsd = (inputTokens / 1000) * modelPricing.input
  const outputCostUsd = (outputTokens / 1000) * modelPricing.output
  const totalCostUsd = inputCostUsd + outputCostUsd

  return {
    provider: 'openrouter' as AiProviderType,
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
 * Check if an error is a rate limit error
 */
export const isRateLimitError = (error: unknown): boolean => {
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

export const isOpenClawRateLimitError = isRateLimitError

/**
 * Check if an error is retryable
 */
export const isRetryableError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false
  if (isRateLimitError(error)) return true
  const status =
    (error as { status?: number }).status ?? (error as { statusCode?: number }).statusCode ?? null
  if (status && [408, 500, 502, 503, 504].includes(status)) return true
  const message = 'message' in error ? String((error as { message?: string }).message).toLowerCase() : ''
  return message.includes('timeout') || message.includes('network') || message.includes('connection')
}

export const isOpenClawRetryableError = isRetryableError

/**
 * P.I.C. Trading Rules validation
 */
export const validateTradeProposal = (proposal: Partial<PICTradeProposal>): {
  valid: boolean
  violations: string[]
} => {
  const violations: string[] = []
  if (!proposal.conviction || proposal.conviction === 'low') {
    violations.push('Rule 3: No "shot in the dark" trades - conviction must be medium or high')
  }
  if (proposal.riskReward && proposal.riskReward < 2) {
    violations.push('Rule 8: Risk/reward must be at least 2:1 for good trade entries')
  }
  if (!proposal.stop) {
    violations.push('Rule 12: Stop loss must be defined - no painful endings')
  }
  return { valid: violations.length === 0, violations }
}

/**
 * OpenRouter model IDs used by P.I.C.
 */
export const OPENROUTER_MODELS = {
  PRIMARY: 'anthropic/claude-opus-4-6',
  FALLBACK: 'anthropic/claude-sonnet-4-6',
  LAST_RESORT: 'anthropic/claude-haiku-4-5-20251001',
} as const

// Backward compat export name
export const OPENCLAW_MODELS = OPENROUTER_MODELS

export type OpenRouterModelId = (typeof OPENROUTER_MODELS)[keyof typeof OPENROUTER_MODELS]
