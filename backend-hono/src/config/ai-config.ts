// [claude-code 2026-03-11] Removed OpenClaw models, OpenRouter primary with Claude Opus 4.6
import priceSystemPrompt from '../prompts/price-system-prompt.js'
import type { AiProviderType, CrossProviderFallback } from '../types/ai-types.js'

type Env = Record<string, string | undefined>

const getEnv = (key: string): string | undefined => {
  const env = (globalThis as { process?: { env?: Env } }).process?.env
  return env?.[key]
}

// Model keys — OpenRouter is the primary provider, Claude Opus 4.6 default
export type AiModelKey =
  | 'sonnet'
  | 'grok'
  // OpenRouter — primary provider (Claude models)
  | 'openrouter-opus'    // Claude Opus 4.6 via OpenRouter (DEFAULT)
  | 'openrouter-sonnet'  // Claude Sonnet 4.6 via OpenRouter (fallback)
  | 'openrouter-haiku'   // Claude Haiku 4.5 via OpenRouter (last resort)
  | 'openrouter-llama'   // Llama 3.3 70B via OpenRouter
  | 'openrouter-grok'    // Grok 4.1 via OpenRouter
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

// Model aliases for backward compatibility
const modelAliases: Record<string, AiModelKey> = {
  sonnet: 'sonnet',
  'claude-sonnet': 'sonnet',
  'sonnet-4.5': 'sonnet',
  opus: 'openrouter-opus',
  grok: 'grok',
  'grok-4.1': 'grok',
  general: 'openrouter-opus',
  'openrouter-opus': 'openrouter-opus',
  'openrouter-claude': 'openrouter-opus',
  'openrouter-sonnet': 'openrouter-sonnet',
  'openrouter-haiku': 'openrouter-haiku',
  'openrouter-llama': 'openrouter-llama',
  'llama-70b': 'openrouter-llama',
  'openrouter-grok': 'openrouter-grok',
  'grok-openrouter': 'openrouter-grok',
  // Legacy OpenClaw aliases → route to OpenRouter Opus
  'openclaw-cao': 'openrouter-opus',
  'harper': 'openrouter-opus',
  'cao': 'openrouter-opus',
  'openclaw-research': 'openrouter-opus',
  'pic-research': 'openrouter-opus',
  'openclaw-fast': 'openrouter-opus',
  'pic-fast': 'openrouter-opus',
  'openclaw-realtime': 'openrouter-opus',
  'pic-realtime': 'openrouter-opus',
  'pma': 'openrouter-opus',
  groq: 'openrouter-opus',
  'llama-3.3-70b': 'openrouter-llama',
  haiku: 'openrouter-haiku',
  tech: 'openrouter-opus',
  'claude-local': 'claude-local',
  'claude-sdk': 'claude-local',
  'claude-max': 'claude-local',
  'opus-local': 'claude-local',
  'github-deepseek': 'github-deepseek',
  'github-gpt4o': 'github-deepseek',
  'github-models': 'github-deepseek',
  'gpt4o-free': 'github-deepseek'
}

export const resolveModelKey = (value?: string): AiModelKey | undefined => {
  if (!value) return undefined
  return modelAliases[value.toLowerCase()]
}

const getPrimaryProvider = (): AiProviderType => {
  const envValue = getEnv('AI_PRIMARY_PROVIDER')
  if (envValue === 'vercel-gateway') return 'vercel-gateway'
  if (envValue === 'openrouter') return 'openrouter'
  return 'openrouter'
}

const enableProviderFallback = getEnv('AI_ENABLE_PROVIDER_FALLBACK') !== 'false'

const defaultModel: AiModelKey = (resolveModelKey(getEnv('AI_DEFAULT_MODEL')) ?? 'openrouter-opus') as AiModelKey

export const defaultAiConfig: AiConfig = {
  models: {
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

    // ── OpenRouter models (PRIMARY) ─────────────────────────────────
    'openrouter-opus': {
      id: 'anthropic/claude-opus-4-6',
      displayName: 'Claude Opus 4.6 (OpenRouter)',
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
    'openrouter-sonnet': {
      id: 'anthropic/claude-sonnet-4-6',
      displayName: 'Claude Sonnet 4.6 (OpenRouter)',
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
    'openrouter-haiku': {
      id: 'anthropic/claude-haiku-4-5-20251001',
      displayName: 'Claude Haiku 4.5 (OpenRouter)',
      provider: 'openai-compatible',
      providerType: 'openrouter',
      apiKeyEnv: 'OPENROUTER_API_KEY',
      baseUrl: openRouterBaseUrl,
      temperature: 0.3,
      maxTokens: 4096,
      timeoutMs: 30_000,
      costPer1kInputUsd: 0.0008,
      costPer1kOutputUsd: 0.004,
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

    'claude-local': {
      id: 'claude-opus-4-6',
      displayName: 'Claude Opus (Local SDK)',
      provider: 'openai-compatible',
      providerType: 'claude-local',
      apiKeyEnv: '',
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
      analysis: 'openrouter-opus',
      research: 'openrouter-opus',
      reasoning: 'openrouter-opus',
      technical: 'openrouter-opus',
      'quick-pulse': 'openrouter-opus',
      quickpulse: 'openrouter-opus',
      news: 'openrouter-opus',
      sentiment: 'openrouter-opus',
      chat: 'openrouter-opus',
      general: 'openrouter-opus',
      'harper-cao': 'openrouter-opus',
      'cao-approval': 'openrouter-opus',
      'cao-consolidation': 'openrouter-opus',
      'pma-1': 'openrouter-opus',
      'pma-2': 'openrouter-opus',
      'prediction-market': 'openrouter-opus',
      'futures-desk': 'openrouter-opus',
      'fa-rippers': 'openrouter-opus',
      'economic-analysis': 'openrouter-opus',
      'fundamentals-desk': 'openrouter-opus',
      'earnings-analysis': 'openrouter-opus',
      'tech-mega-cap': 'openrouter-opus',
    },
    fallbackMap: {
      sonnet: 'openrouter-sonnet',
      grok: 'openrouter-grok',
      'openrouter-opus': 'openrouter-sonnet',
      'openrouter-sonnet': 'openrouter-haiku',
      'openrouter-haiku': 'openrouter-llama',
      'openrouter-llama': 'openrouter-grok',
      'openrouter-grok': 'openrouter-opus',
      'claude-local': 'openrouter-opus',
      'github-deepseek': 'openrouter-llama',
    },
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

export const isOpenRouterModel = (modelKey: AiModelKey): boolean => modelKey.startsWith('openrouter-')
export const isGitHubModelsModel = (modelKey: AiModelKey): boolean => modelKey.startsWith('github-')
export const isClaudeLocalModel = (modelKey: AiModelKey): boolean => modelKey === 'claude-local'

// Legacy compat — always false since OpenClaw removed
export const isOpenClawModel = (_modelKey: AiModelKey): boolean => false
export const getOpenClawGatewayModel = (_modelKey: AiModelKey): string => ''

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

export const getModelsByProvider = (
  providerType: AiProviderType,
  config: AiConfig = defaultAiConfig
): AiModelKey[] => {
  return (Object.keys(config.models) as AiModelKey[]).filter(
    (key) => config.models[key].providerType === providerType
  )
}
