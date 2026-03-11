// [claude-code 2026-03-11] Removed OpenClaw references, OpenRouter primary with Claude Opus 4.6
/**
 * AI Model Selector
 * OpenRouter primary with Claude Opus 4.6 default
 * Fallback chain: Opus → Sonnet → Haiku
 */

import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createXai } from '@ai-sdk/xai'
import { createGroq } from '@ai-sdk/groq'
import {
  defaultAiConfig,
  type AiModelKey as ConfigAiModelKey,
  type AiModelConfig,
  resolveModelKey,
  getCrossProviderEquivalent,
  isOpenRouterModel,
  isGitHubModelsModel,
} from '../../config/ai-config.js'

// Re-export for use by other modules
export type AiModelKey = ConfigAiModelKey
import type { AiProviderType, ModelSelectionContext, ModelSelectionResult } from '../../types/ai-types.js'

const isDev = process.env.NODE_ENV !== 'production'

// Provider availability cache (circuit breaker state)
const providerHealth: Map<AiProviderType, { healthy: boolean; lastCheck: number }> = new Map()
const HEALTH_CHECK_TTL_MS = 60_000

/**
 * Task type to model routing
 * All tasks → Claude Opus 4.6 via OpenRouter
 * Fallback: Sonnet 4.6 → Haiku 4.5
 */
const TASK_MODEL_PREFERENCES: Record<string, AiModelKey[]> = {
  // All tasks route through Claude Opus 4.6 with Claude fallbacks
  news: ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  sentiment: ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  chat: ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  general: ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  technical: ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  quickpulse: ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  research: ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  reasoning: ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],

  // P.I.C. Agent-specific — all Opus first
  'harper-cao': ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  'cao-approval': ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  'cao-consolidation': ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  'pma-1': ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  'pma-2': ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  'prediction-market': ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  'futures-desk': ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  'fa-rippers': ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  'economic-analysis': ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  'fundamentals-desk': ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  'earnings-analysis': ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
  'tech-mega-cap': ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],

  default: ['openrouter-opus', 'openrouter-sonnet', 'openrouter-haiku'],
}

// Runtime token store for user-provided tokens (e.g. GitHub OAuth)
let _runtimeGitHubToken: string | undefined

export function setRuntimeGitHubToken(token: string | undefined): void {
  _runtimeGitHubToken = token
}

function hasApiKey(modelKey: AiModelKey): boolean {
  const config = defaultAiConfig.models[modelKey]
  if (!config) return false
  if (isGitHubModelsModel(modelKey)) {
    return Boolean(_runtimeGitHubToken)
  }
  const apiKey = process.env[config.apiKeyEnv]
  return Boolean(apiKey && apiKey.length > 0)
}

function isProviderHealthy(provider: AiProviderType): boolean {
  const cached = providerHealth.get(provider)
  if (cached && Date.now() - cached.lastCheck < HEALTH_CHECK_TTL_MS) {
    return cached.healthy
  }
  return true
}

export function markProviderUnhealthy(provider: AiProviderType): void {
  providerHealth.set(provider, { healthy: false, lastCheck: Date.now() })
}

export function markProviderHealthy(provider: AiProviderType): void {
  providerHealth.set(provider, { healthy: true, lastCheck: Date.now() })
}

/**
 * Select the best model based on task context
 */
export function selectModel(context: ModelSelectionContext = {}): ModelSelectionResult {
  const taskType = context.taskType?.toLowerCase() ?? 'default'
  const preferredChain = TASK_MODEL_PREFERENCES[taskType] ?? TASK_MODEL_PREFERENCES.default

  if (context.preferredModel) {
    const resolved = resolveModelKey(context.preferredModel)
    if (resolved && hasApiKey(resolved)) {
      const config = defaultAiConfig.models[resolved]
      if (isProviderHealthy(config.providerType)) {
        return {
          model: resolved,
          provider: config.providerType,
          reason: `User preference: ${context.preferredModel}`,
          fallbackChain: preferredChain.filter(m => m !== resolved),
        }
      }
    }
  }

  for (const modelKey of preferredChain) {
    if (!hasApiKey(modelKey)) continue
    const config = defaultAiConfig.models[modelKey]
    if (!isProviderHealthy(config.providerType)) continue
    if (context.maxBudgetUsd !== undefined) {
      const estimatedCost = estimateCost(modelKey, context.inputChars ?? 500)
      if (estimatedCost > context.maxBudgetUsd) continue
    }
    if (context.requiresSpeed && config.timeoutMs > 20_000) continue

    const remainingFallbacks = preferredChain
      .slice(preferredChain.indexOf(modelKey) + 1)
      .filter(m => hasApiKey(m))

    return {
      model: modelKey,
      provider: config.providerType,
      reason: `Task: ${taskType}, available model from preference chain`,
      fallbackChain: remainingFallbacks,
    }
  }

  const allModels = Object.keys(defaultAiConfig.models) as AiModelKey[]
  for (const modelKey of allModels) {
    if (hasApiKey(modelKey)) {
      const config = defaultAiConfig.models[modelKey]
      return {
        model: modelKey,
        provider: config.providerType,
        reason: 'Fallback to any available model',
        fallbackChain: [],
      }
    }
  }

  throw new Error('No AI models available - check API key configuration')
}

function estimateCost(modelKey: AiModelKey, inputChars: number): number {
  const config = defaultAiConfig.models[modelKey]
  const inputTokens = Math.ceil(inputChars / 4)
  const outputTokens = 500
  return (inputTokens / 1000) * config.costPer1kInputUsd +
         (outputTokens / 1000) * config.costPer1kOutputUsd
}

export function getFallbackModel(failedModel: AiModelKey): ModelSelectionResult | null {
  const sameProviderFallback = defaultAiConfig.routing.fallbackMap[failedModel]
  if (sameProviderFallback && hasApiKey(sameProviderFallback)) {
    const fallbackConfig = defaultAiConfig.models[sameProviderFallback]
    if (isProviderHealthy(fallbackConfig.providerType)) {
      return {
        model: sameProviderFallback,
        provider: fallbackConfig.providerType,
        reason: `Same-provider fallback from ${failedModel}`,
        fallbackChain: [],
      }
    }
  }

  if (defaultAiConfig.providers.enableFallback) {
    const crossProvider = getCrossProviderEquivalent(failedModel)
    if (crossProvider && hasApiKey(crossProvider.model as AiModelKey)) {
      if (isProviderHealthy(crossProvider.provider)) {
        return {
          model: crossProvider.model as AiModelKey,
          provider: crossProvider.provider,
          reason: `Cross-provider fallback from ${failedModel}`,
          fallbackChain: [],
        }
      }
    }
  }

  return null
}

/**
 * Create AI SDK client for the selected model
 */
export function createModelClient(modelKey: AiModelKey) {
  const config = defaultAiConfig.models[modelKey]
  const apiKey = process.env[config.apiKeyEnv]

  if (!apiKey) {
    throw new Error(`Missing API key for model ${modelKey} (env: ${config.apiKeyEnv})`)
  }

  // OpenRouter models use OpenAI-compatible client
  if (isOpenRouterModel(modelKey)) {
    const client = createOpenAI({
      apiKey,
      baseURL: config.baseUrl,
      headers: {
        'HTTP-Referer': process.env.OPENROUTER_APP_URL ?? 'https://pulse-solvys.vercel.app',
        'X-Title': process.env.OPENROUTER_APP_NAME ?? 'Pulse-AI-Gateway',
      },
    })
    return client(config.id)
  }

  // GitHub Models use OpenAI-compatible client with user's OAuth token
  if (isGitHubModelsModel(modelKey)) {
    const ghToken = _runtimeGitHubToken
    if (!ghToken) {
      throw new Error('GitHub Models requires authentication — sign in with GitHub first')
    }
    const client = createOpenAI({
      apiKey: ghToken,
      baseURL: config.baseUrl,
    })
    return client(config.id)
  }

  // Vercel Gateway models - route based on provider type in model ID
  if (config.providerType === 'vercel-gateway') {
    if (config.id.startsWith('anthropic/')) {
      const client = createAnthropic({ apiKey })
      return client(config.id.replace('anthropic/', ''))
    }
    if (config.id.startsWith('xai/')) {
      const client = createXai({ apiKey })
      return client(config.id.replace('xai/', ''))
    }
    if (config.id.startsWith('groq/')) {
      const client = createGroq({ apiKey })
      return client(config.id.replace('groq/', ''))
    }
    const client = createOpenAI({
      apiKey,
      baseURL: config.baseUrl,
    })
    return client(config.id)
  }

  throw new Error(`Unknown provider type for model ${modelKey}`)
}

export function getModelConfig(modelKey: AiModelKey): AiModelConfig {
  return defaultAiConfig.models[modelKey]
}

export function getAvailableModels(): AiModelKey[] {
  return (Object.keys(defaultAiConfig.models) as AiModelKey[]).filter(hasApiKey)
}

export function logModelSelection(result: ModelSelectionResult, context: ModelSelectionContext): void {
  if (isDev) {
    console.log('[AI] Model selected:', {
      model: result.model,
      provider: result.provider,
      reason: result.reason,
      fallbacks: result.fallbackChain.length,
      context: {
        task: context.taskType,
        preferred: context.preferredModel,
        budget: context.maxBudgetUsd,
      },
    })
  }
}
