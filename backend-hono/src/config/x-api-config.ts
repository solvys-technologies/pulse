type Env = Record<string, string | undefined>

const getEnv = (key: string): string | undefined => {
  const env = (globalThis as { process?: { env?: Env } }).process?.env
  return env?.[key]
}

export type XApiSource = 'FinancialJuice' | 'InsiderWire'

export interface RateLimitSettings {
  limit: number
  windowMs: number
}

export interface BackoffSettings {
  baseMs: number
  maxMs: number
  jitterMs: number
  maxRetries: number
}

export interface XApiConfig {
  baseUrl: string
  bearerToken?: string
  sources: Record<
    XApiSource,
    {
      handle: string
      userId?: string
    }
  >
  rateLimit: RateLimitSettings
  backoff: BackoffSettings
  requestTimeoutMs: number
}

export const defaultXApiConfig: XApiConfig = {
  baseUrl: getEnv('X_API_BASE_URL') ?? 'https://api.twitter.com/2',
  bearerToken: getEnv('X_API_BEARER_TOKEN'),
  sources: {
    FinancialJuice: { handle: 'FinancialJuice' },
    InsiderWire: { handle: 'InsiderWire' }
  },
  rateLimit: {
    limit: 300,
    windowMs: 15 * 60 * 1000
  },
  backoff: {
    baseMs: 500,
    maxMs: 30_000,
    jitterMs: 250,
    maxRetries: 5
  },
  requestTimeoutMs: 10_000
}

export const xApiEndpoints = {
  userByUsername: (username: string) => `/users/by/username/${username}`,
  userTimeline: (userId: string) =>
    `/users/${userId}/tweets?tweet.fields=created_at,text,entities&expansions=author_id`
}

