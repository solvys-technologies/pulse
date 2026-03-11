/**
 * AI Model Selector
 * Vercel AI Gateway integration with model routing and fallback logic
 * Day 15 - Phase 5 Implementation
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
  isOpenClawModel,
  isGitHubModelsModel,
  getOpenClawGatewayModel,
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
 * All tasks through OpenClaw gateway (Groq-powered, free tier)
 * OpenRouter kept as fallback only
 */
const TASK_MODEL_PREFERENCES: Record<string, AiModelKey[]> = {
  // News/sentiment — OpenClaw realtime (Groq), OpenRouter fallback
  news: ['openclaw-realtime', 'openrouter-grok', 'openrouter-llama'],
  sentiment: ['openclaw-realtime', 'openrouter-grok', 'openrouter-llama'],

  // Chat/general — OpenClaw fast (Groq Llama 3.3 70B @ ~750 tok/s)
  chat: ['openclaw-fast', 'openrouter-llama', 'openrouter-grok'],
  general: ['openclaw-fast', 'openrouter-llama', 'openrouter-grok'],

  // Technical analysis — OpenClaw fast
  technical: ['openclaw-fast', 'openrouter-llama', 'openrouter-grok'],
  quickpulse: ['openclaw-fast', 'openrouter-llama', 'openrouter-grok'],

  // Deep research / reasoning — OpenClaw CAO (Groq), OpenRouter fallback
  research: ['openclaw-cao', 'openrouter-opus', 'openrouter-sonnet'],
  reasoning: ['openclaw-cao', 'openrouter-opus', 'openrouter-sonnet'],

  // OpenClaw P.I.C. Agent-specific task routing
  // Harper/CAO - Executive reasoning (Opus via OpenClaw, fallback to OpenRouter)
  'harper-cao': ['openclaw-cao', 'openrouter-opus', 'openrouter-sonnet'],
  'cao-approval': ['openclaw-cao', 'openrouter-opus', 'openrouter-sonnet'],
  'cao-consolidation': ['openclaw-research', 'openrouter-sonnet', 'openrouter-llama'],

  // PMA agents - Real-time prediction market analysis (Grok)
  'pma-1': ['openclaw-realtime', 'openrouter-grok', 'openrouter-llama'],
  'pma-2': ['openclaw-realtime', 'openrouter-grok', 'openrouter-llama'],
  'prediction-market': ['openclaw-realtime', 'openrouter-grok', 'openrouter-llama'],

  // Futures Desk - Fast technical analysis (Llama)
  'futures-desk': ['openclaw-fast', 'openrouter-llama', 'openrouter-grok'],
  'fa-rippers': ['openclaw-fast', 'openrouter-llama', 'openrouter-grok'],
  'economic-analysis': ['openclaw-realtime', 'openrouter-grok', 'openrouter-llama'],

  // Fundamentals Desk - Deep research (Opus)
  'fundamentals-desk': ['openclaw-cao', 'openrouter-opus', 'openrouter-sonnet'],
  'earnings-analysis': ['openclaw-cao', 'openrouter-opus', 'openrouter-sonnet'],
  'tech-mega-cap': ['openclaw-research', 'openrouter-sonnet', 'openrouter-llama'],

  // Default fallback chain — OpenClaw (Groq-powered) first
  default: ['openclaw-fast', 'openrouter-llama', 'openrouter-grok'],
}

// Runtime token store for user-provided tokens (e.g. GitHub OAuth)
let _runtimeGitHubToken: string | undefined

/** Set the GitHub token for the current request context */
export function setRuntimeGitHubToken(token: string | undefined): void {
  _runtimeGitHubToken = token
}

/**
 * Check if a provider's API key is available
 */
function hasApiKey(modelKey: AiModelKey): boolean {
  const config = defaultAiConfig.models[modelKey]
  if (!config) return false

  // GitHub Models uses runtime OAuth token, not env var
  if (isGitHubModelsModel(modelKey)) {
    return Boolean(_runtimeGitHubToken)
  }

  const apiKey = process.env[config.apiKeyEnv]
  return Boolean(apiKey && apiKey.length > 0)
}

/**
 * Check provider health with caching
 */
function isProviderHealthy(provider: AiProviderType): boolean {
  const cached = providerHealth.get(provider)
  if (cached && Date.now() - cached.lastCheck < HEALTH_CHECK_TTL_MS) {
    return cached.healthy
  }
  // Assume healthy if no recent check
  return true
}

/**
 * Mark a provider as unhealthy
 */
export function markProviderUnhealthy(provider: AiProviderType): void {
  providerHealth.set(provider, { healthy: false, lastCheck: Date.now() })
}

/**
 * Mark a provider as healthy
 */
export function markProviderHealthy(provider: AiProviderType): void {
  providerHealth.set(provider, { healthy: true, lastCheck: Date.now() })
}

/**
 * Select the best model based on task context
 */
export function selectModel(context: ModelSelectionContext = {}): ModelSelectionResult {
  const taskType = context.taskType?.toLowerCase() ?? 'default'
  const preferredChain = TASK_MODEL_PREFERENCES[taskType] ?? TASK_MODEL_PREFERENCES.default

  // If user specified a preferred model, try that first
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

  // Find first available model from preference chain
  for (const modelKey of preferredChain) {
    if (!hasApiKey(modelKey)) continue
    
    const config = defaultAiConfig.models[modelKey]
    if (!isProviderHealthy(config.providerType)) continue

    // Check budget constraints
    if (context.maxBudgetUsd !== undefined) {
      const estimatedCost = estimateCost(modelKey, context.inputChars ?? 500)
      if (estimatedCost > context.maxBudgetUsd) continue
    }

    // Speed requirements
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

  // Last resort: any available model
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

/**
 * Estimate cost for a given model and input size
 */
function estimateCost(modelKey: AiModelKey, inputChars: number): number {
  const config = defaultAiConfig.models[modelKey]
  const inputTokens = Math.ceil(inputChars / 4) // rough estimate
  const outputTokens = 500 // assume moderate response
  
  return (inputTokens / 1000) * config.costPer1kInputUsd +
         (outputTokens / 1000) * config.costPer1kOutputUsd
}

/**
 * Get fallback model when primary fails
 */
export function getFallbackModel(failedModel: AiModelKey): ModelSelectionResult | null {
  const config = defaultAiConfig.models[failedModel]
  
  // Try same-provider fallback first
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

  // Try cross-provider fallback
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

  // OpenClaw P.I.C. agent models use OpenAI-compatible client
  if (isOpenClawModel(modelKey)) {
    const client = createOpenAI({
      apiKey,
      baseURL: config.baseUrl,
      headers: {
        'X-OpenClaw-App': process.env.OPENCLAW_APP_NAME ?? 'Pulse-PIC-Gateway',
      },
    })
    return client(getOpenClawGatewayModel(modelKey))
  }

  // Vercel Gateway models - route based on provider type in model ID
  if (config.providerType === 'vercel-gateway') {
    // Use gateway URL with appropriate SDK
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
    
    // Fallback to OpenAI-compatible client
    const client = createOpenAI({
      apiKey,
      baseURL: config.baseUrl,
    })
    return client(config.id)
  }

  throw new Error(`Unknown provider type for model ${modelKey}`)
}

/**
 * Get model configuration
 */
export function getModelConfig(modelKey: AiModelKey): AiModelConfig {
  return defaultAiConfig.models[modelKey]
}

/**
 * Get available models
 */
export function getAvailableModels(): AiModelKey[] {
  return (Object.keys(defaultAiConfig.models) as AiModelKey[]).filter(hasApiKey)
}

/**
 * Log model selection for debugging
 */
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
