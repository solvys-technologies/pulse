type Env = Record<string, string | undefined>

const getEnv = (key: string): string | undefined => {
  const env = (globalThis as { process?: { env?: Env } }).process?.env
  return env?.[key]
}

export type AiModelKey = 'opus' | 'haiku' | 'grok'
export type AiProvider = 'anthropic' | 'openai-compatible'

export interface AiModelConfig {
  id: string
  displayName: string
  provider: AiProvider
  apiKeyEnv: string
  baseUrl?: string
  temperature: number
  maxTokens: number
  timeoutMs: number
  costPer1kInputUsd: number
  costPer1kOutputUsd: number
}

export interface AiRoutingConfig {
  defaultModel: AiModelKey
  taskModelMap: Record<string, AiModelKey>
  fallbackMap: Record<AiModelKey, AiModelKey>
}

export interface AiConversationConfig {
  maxHistoryMessages: number
}

export interface AiPerformanceConfig {
  slowResponseMs: number
}

export interface AiConfig {
  models: Record<AiModelKey, AiModelConfig>
  routing: AiRoutingConfig
  conversation: AiConversationConfig
  performance: AiPerformanceConfig
  systemPrompt?: string
}

const resolveModelKey = (value?: string): AiModelKey | undefined => {
  if (!value) return undefined
  if (value === 'opus' || value === 'haiku' || value === 'grok') {
    return value
  }
  return undefined
}

const defaultModel = resolveModelKey(getEnv('AI_DEFAULT_MODEL')) ?? 'haiku'

export const defaultAiConfig: AiConfig = {
  models: {
    opus: {
      id: getEnv('CLAUDE_OPUS_MODEL') ?? 'claude-opus-4-5',
      displayName: 'Claude Opus 4.5',
      provider: 'anthropic',
      apiKeyEnv: 'ANTHROPIC_API_KEY',
      temperature: 0.4,
      maxTokens: 2048,
      timeoutMs: 30_000,
      costPer1kInputUsd: 0.015,
      costPer1kOutputUsd: 0.075
    },
    haiku: {
      id: getEnv('CLAUDE_HAIKU_MODEL') ?? 'claude-haiku-4-5',
      displayName: 'Claude Haiku 4.5',
      provider: 'anthropic',
      apiKeyEnv: 'ANTHROPIC_API_KEY',
      temperature: 0.3,
      maxTokens: 1024,
      timeoutMs: 15_000,
      costPer1kInputUsd: 0.0008,
      costPer1kOutputUsd: 0.004
    },
    grok: {
      id: getEnv('GROK_MODEL') ?? 'grok-beta',
      displayName: 'Grok',
      provider: 'openai-compatible',
      apiKeyEnv: 'GROK_API_KEY',
      baseUrl: getEnv('GROK_BASE_URL') ?? 'https://api.x.ai/v1',
      temperature: 0.4,
      maxTokens: 1024,
      timeoutMs: 20_000,
      costPer1kInputUsd: 0.005,
      costPer1kOutputUsd: 0.015
    }
  },
  routing: {
    defaultModel,
    taskModelMap: {
      analysis: 'opus',
      research: 'opus',
      reasoning: 'opus',
      news: 'grok',
      sentiment: 'grok',
      fast: 'haiku',
      chat: 'haiku'
    },
    fallbackMap: {
      opus: 'haiku',
      haiku: 'grok',
      grok: 'haiku'
    }
  },
  conversation: {
    maxHistoryMessages: Number.parseInt(getEnv('AI_MAX_HISTORY_MESSAGES') ?? '24', 10)
  },
  performance: {
    slowResponseMs: Number.parseInt(getEnv('AI_SLOW_RESPONSE_MS') ?? '3000', 10)
  },
  systemPrompt: getEnv('AI_SYSTEM_PROMPT')
}
