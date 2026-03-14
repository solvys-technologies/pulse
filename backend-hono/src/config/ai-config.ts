// [claude-code 2026-03-13] Hermes migration — replaced OpenClaw gateway with Groq direct
import priceSystemPrompt from '../prompts/price-system-prompt.js'
import type { AiProviderType, CrossProviderFallback } from '../types/ai-types.js'

type Env = Record<string, string | undefined>

const getEnv = (key: string): string | undefined => {
  const env = (globalThis as { process?: { env?: Env } }).process?.env
  return env?.[key]
}

// Model keys - OpenRouter provides alternative routes to same models
export type AiModelKey =
  | 'sonnet'
  | 'grok'
  // OpenRouter alternative routes
  | 'openrouter-sonnet'  // Claude Sonnet 4.5 via OpenRouter
  | 'openrouter-opus'    // Claude Opus 4.5 via OpenRouter
  | 'openrouter-llama'   // Llama 3.3 70B via OpenRouter
  | 'openrouter-grok'    // Grok 4.1 via OpenRouter
  // Hermes P.I.C. agents (Groq direct, no gateway)
  | 'hermes-cao'         // CAO/Harper reasoning (Kimi K2)
  | 'hermes-research'    // Deep research (Maverick 128E)
  | 'hermes-fast'        // Fast analysis (Scout)
  | 'hermes-realtime'    // Real-time news (Scout)
  // Claude Code SDK Bridge (free via Max subscription)
  | 'claude-local'      // Claude Opus via local CLI bridge
  // GitHub Models (free, OAuth-powered)
  | 'github-deepseek'   // DeepSeek R1 via GitHub Models

export type AiProvider = 'openai-compatible'

export interface AiModelConfig {
  id: string
  displayName: string
  provider: AiProvider
  providerType: AiProviderType
  apiKeyEnv: string
  baseUrl?: string
  temperature: number
  maxTokens: number
  timeoutMs: number
  costPer1kInputUsd: number
  costPer1kOutputUsd: number
  contextWindow?: number
  supportsStreaming?: boolean
  supportsVision?: boolean
}

export interface AiRoutingConfig {
  defaultModel: AiModelKey
  taskModelMap: Record<string, AiModelKey>
  fallbackMap: Record<AiModelKey, AiModelKey>
  crossProviderFallbacks: CrossProviderFallback[]
}

export interface AiProviderSettings {
  primary: AiProviderType
  enableFallback: boolean
  openRouter: {
    baseUrl: string
    appUrl: string
    appName: string
  }
  vercelGateway: {
    baseUrl: string
  }
  hermes: {
    baseUrl: string
    appName: string
  }
  githubModels: {
    baseUrl: string
  }
}

export interface AiConversationConfig {
  maxHistoryMessages: number
  maxContextTokens: number
  summarizationThreshold: number
}

export interface AiPerformanceConfig {
  slowResponseMs: number
}

export interface AiConfig {
  models: Record<AiModelKey, AiModelConfig>
  routing: AiRoutingConfig
  providers: AiProviderSettings
  conversation: AiConversationConfig
  performance: AiPerformanceConfig
  systemPrompt?: string
}

// Provider base URLs
const vercelGatewayBaseUrl =
  getEnv('VERCEL_AI_GATEWAY_BASE_URL') ?? 'https://ai-gateway.vercel.sh/v1/chat/completions'

const openRouterBaseUrl = 'https://openrouter.ai/api/v1'
const githubModelsBaseUrl = 'https://models.inference.ai.azure.com'

// Hermes / Groq direct — no gateway middleman
const normalizeHermesBaseUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '')
  return trimmed.endsWith('/v1') ? trimmed.slice(0, -3) : trimmed
}

const getHermesOpenAIBaseUrl = (): string => {
  const base = normalizeHermesBaseUrl(
    getEnv('HERMES_BASE_URL') ?? 'https://api.groq.com/openai/v1'
  )
  return `${base}/v1`
}

// Backward compat
const normalizeOpenClawGatewayBaseUrl = normalizeHermesBaseUrl
const getOpenClawOpenAIBaseUrl = getHermesOpenAIBaseUrl

// Model aliases for backward compatibility
const modelAliases: Record<string, AiModelKey> = {
  // Vercel Gateway models
  sonnet: 'sonnet',
  'claude-sonnet': 'sonnet',
  'sonnet-4.5': 'sonnet',
  opus: 'sonnet',
  grok: 'grok',
  'grok-4.1': 'grok',
  general: 'grok',
  groq: 'hermes-fast',
  'llama-3.3-70b': 'hermes-fast',
  haiku: 'hermes-fast',
  tech: 'hermes-fast',
  // OpenRouter alternative routes
  'openrouter-sonnet': 'openrouter-sonnet',
  'openrouter-claude': 'openrouter-sonnet',
  'openrouter-opus': 'openrouter-opus',
  'openrouter-llama': 'openrouter-llama',
  'llama-70b': 'openrouter-llama',
  'openrouter-grok': 'openrouter-grok',
  'grok-openrouter': 'openrouter-grok',
  // Hermes P.I.C. agent routes
  'hermes-cao': 'hermes-cao',
  'harper': 'hermes-cao',
  'cao': 'hermes-cao',
  'hermes-research': 'hermes-research',
  'pic-research': 'hermes-research',
  'hermes-fast': 'hermes-fast',
  'pic-fast': 'hermes-fast',
  'hermes-realtime': 'hermes-realtime',
  'pic-realtime': 'hermes-realtime',
  'pma': 'hermes-realtime',
  // Backward compat — old openclaw aliases still resolve
  'openclaw-cao': 'hermes-cao',
  'openclaw-research': 'hermes-research',
  'openclaw-fast': 'hermes-fast',
  'openclaw-realtime': 'hermes-realtime',
  // Claude Code SDK Bridge (Max subscription)
  'claude-local': 'claude-local',
  'claude-sdk': 'claude-local',
  'claude-max': 'claude-local',
  'opus-local': 'claude-local',
  // GitHub Models (GPT-4o fallback)
  'github-deepseek': 'github-deepseek',
  'github-gpt4o': 'github-deepseek',
  'github-models': 'github-deepseek',
  'gpt4o-free': 'github-deepseek'
}

export const resolveModelKey = (value?: string): AiModelKey | undefined => {
  if (!value) return undefined
  return modelAliases[value.toLowerCase()]
}

// Determine primary provider from env
const getPrimaryProvider = (): AiProviderType => {
  const envValue = getEnv('AI_PRIMARY_PROVIDER')
  if (envValue === 'vercel-gateway') return 'vercel-gateway'
  if (envValue === 'openrouter') return 'openrouter'
  if (envValue === 'hermes' || envValue === 'openclaw') return 'hermes'
  // Default to openrouter if API key is present
  return getEnv('OPENROUTER_API_KEY') ? 'openrouter' : 'vercel-gateway'
}

const enableProviderFallback = getEnv('AI_ENABLE_PROVIDER_FALLBACK') !== 'false'

// Default to Hermes (Groq direct, free tier) — falls back to OpenRouter
const defaultModel = resolveModelKey(getEnv('AI_DEFAULT_MODEL'))
  ?? (getEnv('HERMES_API_KEY') ? 'hermes-fast' as AiModelKey : 'openrouter-llama')

export const defaultAiConfig: AiConfig = {
  models: {
    // Vercel Gateway models (existing)
    sonnet: {
      id: 'anthropic/claude-sonnet-4.5',
      displayName: 'Claude Sonnet 4.5',
      provider: 'openai-compatible',
      providerType: 'vercel-gateway',
      apiKeyEnv: 'VERCEL_AI_GATEWAY_API_KEY',
      baseUrl: vercelGatewayBaseUrl,
      temperature: 0.4,
      maxTokens: 4096,
      timeoutMs: 45_000,
      costPer1kInputUsd: 0.003,
      costPer1kOutputUsd: 0.015,
      contextWindow: 200_000,
      supportsStreaming: true,
      supportsVision: true
    },
    grok: {
      id: 'xai/grok-4.1',
      displayName: 'Grok 4.1 Reasoning',
      provider: 'openai-compatible',
      providerType: 'vercel-gateway',
      apiKeyEnv: 'VERCEL_AI_GATEWAY_API_KEY',
      baseUrl: vercelGatewayBaseUrl,
      temperature: 0.4,
      maxTokens: 2048,
      timeoutMs: 30_000,
      costPer1kInputUsd: 0.003,
      costPer1kOutputUsd: 0.015,
      contextWindow: 128_000,
      supportsStreaming: true,
      supportsVision: false
    },
    // OpenRouter alternative routes (same models, different provider)
    'openrouter-sonnet': {
      id: 'anthropic/claude-sonnet-4',
      displayName: 'Claude Sonnet 4.5 (OpenRouter)',
      provider: 'openai-compatible',
      providerType: 'openrouter',
      apiKeyEnv: 'OPENROUTER_API_KEY',
      baseUrl: openRouterBaseUrl,
      temperature: 0.4,
      maxTokens: 4096,
      timeoutMs: 60_000,
      costPer1kInputUsd: 0.003,
      costPer1kOutputUsd: 0.015,
      contextWindow: 200_000,
      supportsStreaming: true,
      supportsVision: true
    },
    'openrouter-llama': {
      id: 'meta-llama/llama-3.3-70b-instruct',
      displayName: 'Llama 3.3 70B (OpenRouter)',
      provider: 'openai-compatible',
      providerType: 'openrouter',
      apiKeyEnv: 'OPENROUTER_API_KEY',
      baseUrl: openRouterBaseUrl,
      temperature: 0.25,
      maxTokens: 2048,
      timeoutMs: 30_000,
      costPer1kInputUsd: 0.00012,
      costPer1kOutputUsd: 0.0003,
      contextWindow: 128_000,
      supportsStreaming: true,
      supportsVision: false
    },
    'openrouter-grok': {
      id: 'x-ai/grok-4',
      displayName: 'Grok 4.1 (OpenRouter)',
      provider: 'openai-compatible',
      providerType: 'openrouter',
      apiKeyEnv: 'OPENROUTER_API_KEY',
      baseUrl: openRouterBaseUrl,
      temperature: 0.3,
      maxTokens: 4096,
      timeoutMs: 45_000,
      costPer1kInputUsd: 0.003,
      costPer1kOutputUsd: 0.015,
      contextWindow: 128_000,
      supportsStreaming: true,
      supportsVision: false
    },
    'openrouter-opus': {
      id: 'anthropic/claude-opus-4',
      displayName: 'Claude Opus 4.5 (OpenRouter)',
      provider: 'openai-compatible',
      providerType: 'openrouter',
      apiKeyEnv: 'OPENROUTER_API_KEY',
      baseUrl: openRouterBaseUrl,
      temperature: 0.4,
      maxTokens: 8192,
      timeoutMs: 90_000,
      costPer1kInputUsd: 0.015,
      costPer1kOutputUsd: 0.075,
      contextWindow: 200_000,
      supportsStreaming: true,
      supportsVision: true
    },

    // Hermes P.I.C. Agent Models (Groq direct, free tier — no gateway)
    // [claude-code 2026-03-13] Groq direct — model IDs without groq/ prefix
    'hermes-cao': {
      id: 'moonshotai/kimi-k2-instruct',
      displayName: 'Hermes CAO (Kimi K2)',
      provider: 'openai-compatible',
      providerType: 'hermes',
      apiKeyEnv: 'HERMES_API_KEY',
      baseUrl: getHermesOpenAIBaseUrl(),
      temperature: 0.3,
      maxTokens: 8192,
      timeoutMs: 30_000,
      costPer1kInputUsd: 0,
      costPer1kOutputUsd: 0,
      contextWindow: 131_072,
      supportsStreaming: true,
      supportsVision: false
    },
    'hermes-research': {
      id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      displayName: 'Hermes Research (Maverick 128E)',
      provider: 'openai-compatible',
      providerType: 'hermes',
      apiKeyEnv: 'HERMES_API_KEY',
      baseUrl: getHermesOpenAIBaseUrl(),
      temperature: 0.4,
      maxTokens: 8192,
      timeoutMs: 30_000,
      costPer1kInputUsd: 0,
      costPer1kOutputUsd: 0,
      contextWindow: 131_072,
      supportsStreaming: true,
      supportsVision: false
    },
    'hermes-fast': {
      id: 'meta-llama/llama-4-scout-17b-16e-instruct',
      displayName: 'Hermes Fast (Scout)',
      provider: 'openai-compatible',
      providerType: 'hermes',
      apiKeyEnv: 'HERMES_API_KEY',
      baseUrl: getHermesOpenAIBaseUrl(),
      temperature: 0.25,
      maxTokens: 8192,
      timeoutMs: 20_000,
      costPer1kInputUsd: 0,
      costPer1kOutputUsd: 0,
      contextWindow: 131_072,
      supportsStreaming: true,
      supportsVision: false
    },
    'hermes-realtime': {
      id: 'meta-llama/llama-4-scout-17b-16e-instruct',
      displayName: 'Hermes Realtime (Scout)',
      provider: 'openai-compatible',
      providerType: 'hermes',
      apiKeyEnv: 'HERMES_API_KEY',
      baseUrl: getHermesOpenAIBaseUrl(),
      temperature: 0.3,
      maxTokens: 8192,
      timeoutMs: 25_000,
      costPer1kInputUsd: 0,
      costPer1kOutputUsd: 0,
      contextWindow: 131_072,
      supportsStreaming: true,
      supportsVision: false
    },

    // GitHub Models (free via GitHub OAuth) — fallback model
    'github-deepseek': {
      id: getEnv('GITHUB_MODELS_MODEL_ID') ?? 'gpt-4o',
      displayName: 'GPT-4o (GitHub Models)',
      provider: 'openai-compatible',
      providerType: 'github-models',
      apiKeyEnv: 'GITHUB_TOKEN',
      baseUrl: githubModelsBaseUrl,
      temperature: 0.4,
      maxTokens: 4096,
      timeoutMs: 30_000,
      costPer1kInputUsd: 0,
      costPer1kOutputUsd: 0,
      contextWindow: 128_000,
      supportsStreaming: true,
      supportsVision: true
    },

    // Claude Code SDK Bridge (free via Max subscription — $0 per-token cost)
    // [claude-code 2026-03-10] Local CLI bridge using claude --print --output-format stream-json
    'claude-local': {
      id: 'claude-opus-4-6',
      displayName: 'Claude Opus (Local SDK)',
      provider: 'openai-compatible',
      providerType: 'claude-local',
      apiKeyEnv: '', // No API key needed — uses Max subscription via CLI
      temperature: 0.4,
      maxTokens: 16384,
      timeoutMs: 120_000,
      costPer1kInputUsd: 0,
      costPer1kOutputUsd: 0,
      contextWindow: 200_000,
      supportsStreaming: true,
      supportsVision: true
    }
  },

  routing: {
    defaultModel,
    taskModelMap: {
      // All tasks through Hermes/Groq direct (free tier)
      // Fast technical analysis
      analysis: 'hermes-fast',
      // Deep research — Hermes CAO (Kimi K2)
      research: 'hermes-cao',
      // Complex reasoning — Hermes CAO
      reasoning: 'hermes-cao',
      // Ultra-fast technical
      technical: 'hermes-fast',
      'quick-pulse': 'hermes-fast',
      quickpulse: 'hermes-fast',
      // Real-time news
      news: 'hermes-realtime',
      // Sentiment analysis
      sentiment: 'hermes-realtime',
      // General chat
      chat: 'hermes-fast',
      general: 'hermes-fast',
      // Hermes P.I.C. agent-specific tasks
      'harper-cao': 'hermes-cao',
      'cao-approval': 'hermes-cao',
      'cao-consolidation': 'hermes-research',
      'pma-1': 'hermes-realtime',
      'pma-2': 'hermes-realtime',
      'prediction-market': 'hermes-realtime',
      'futures-desk': 'hermes-fast',
      'fa-rippers': 'hermes-fast',
      'economic-analysis': 'hermes-realtime',
      'fundamentals-desk': 'hermes-cao',
      'earnings-analysis': 'hermes-cao',
      'tech-mega-cap': 'hermes-research'
    },
    // OpenRouter + Hermes fallback chain
    fallbackMap: {
      sonnet: 'openrouter-sonnet',
      grok: 'openrouter-grok',
      'openrouter-sonnet': 'openrouter-llama',
      'openrouter-llama': 'openrouter-grok',
      'openrouter-grok': 'openrouter-opus',
      'openrouter-opus': 'openrouter-sonnet',
      // Hermes fallbacks (fall back to OpenRouter equivalents)
      'hermes-cao': 'openrouter-opus',
      'hermes-research': 'openrouter-sonnet',
      'hermes-fast': 'openrouter-llama',
      'hermes-realtime': 'openrouter-grok',
      // Claude Local SDK fallback to OpenRouter Opus
      'claude-local': 'openrouter-opus',
      // GitHub Models fallback to OpenRouter
      'github-deepseek': 'openrouter-llama'
    },
    // Cross-provider fallbacks (all within OpenRouter now)
    crossProviderFallbacks: []
  },

  providers: {
    primary: getPrimaryProvider(),
    enableFallback: enableProviderFallback,
    openRouter: {
      baseUrl: openRouterBaseUrl,
      appUrl: getEnv('OPENROUTER_APP_URL') ?? 'https://pulse-solvys.vercel.app',
      appName: getEnv('OPENROUTER_APP_NAME') ?? 'Pulse-AI-Gateway'
    },
    vercelGateway: {
      baseUrl: vercelGatewayBaseUrl
    },
    hermes: {
      baseUrl: getHermesOpenAIBaseUrl(),
      appName: getEnv('HERMES_APP_NAME') ?? 'Pulse-PIC-Hermes'
    },
    githubModels: {
      baseUrl: githubModelsBaseUrl
    }
  },

  conversation: {
    maxHistoryMessages: Number.parseInt(getEnv('AI_MAX_HISTORY_MESSAGES') ?? '50', 10),
    maxContextTokens: Number.parseInt(getEnv('AI_MAX_CONTEXT_TOKENS') ?? '100000', 10),
    summarizationThreshold: Number.parseInt(getEnv('AI_SUMMARIZATION_THRESHOLD') ?? '80000', 10),
  },

  performance: {
    slowResponseMs: Number.parseInt(getEnv('AI_SLOW_RESPONSE_MS') ?? '3000', 10)
  },

  systemPrompt: priceSystemPrompt
}

// Helper to check if a model uses OpenRouter
export const isOpenRouterModel = (modelKey: AiModelKey): boolean => {
  return modelKey.startsWith('openrouter-')
}

// Helper to check if a model uses Hermes (Groq direct)
export const isHermesModel = (modelKey: AiModelKey): boolean => {
  return modelKey.startsWith('hermes-')
}

// Backward compat
export const isOpenClawModel = isHermesModel

// Helper to check if a model uses GitHub Models
export const isGitHubModelsModel = (modelKey: AiModelKey): boolean => {
  return modelKey.startsWith('github-')
}

// Helper to check if a model uses Claude Local SDK bridge
export const isClaudeLocalModel = (modelKey: AiModelKey): boolean => {
  return modelKey === 'claude-local'
}

// Get the actual Groq model ID for Hermes models
// Groq direct — no gateway, no clawdbot:main alias, just the real model ID
export const getHermesModelId = (modelKey: AiModelKey): string => {
  const config = defaultAiConfig.models[modelKey]
  return config?.id ?? 'meta-llama/llama-4-scout-17b-16e-instruct'
}

// Backward compat
export const getOpenClawGatewayModel = getHermesModelId

// Helper to get equivalent model across providers
export const getCrossProviderEquivalent = (
  modelKey: AiModelKey,
  config: AiConfig = defaultAiConfig
): { model: AiModelKey; provider: AiProviderType } | null => {
  const fallback = config.routing.crossProviderFallbacks.find((f) => f.from === modelKey)
  if (fallback) {
    return { model: fallback.to as AiModelKey, provider: fallback.provider }
  }
  return null
}

// Get all models for a specific provider
export const getModelsByProvider = (
  providerType: AiProviderType,
  config: AiConfig = defaultAiConfig
): AiModelKey[] => {
  return (Object.keys(config.models) as AiModelKey[]).filter(
    (key) => config.models[key].providerType === providerType
  )
}
