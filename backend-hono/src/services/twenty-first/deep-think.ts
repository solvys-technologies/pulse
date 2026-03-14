// [claude-code 2026-03-10] 21st API deep thinking fallback — used when Claude SDK is unavailable + thinkHarder
/**
 * 21st API Deep Thinking Service
 * Fallback for extended reasoning when Claude SDK bridge is unavailable.
 * Uses 21st API (21st.dev) for deep thinking inference.
 *
 * Priority chain position: #3
 *   1. Hermes/Groq (fast, free) — default
 *   2. Claude SDK Bridge (Opus, free via Max) — for thinkHarder
 *   3. 21st API (this) — when Claude SDK unavailable + thinkHarder
 *   4. OpenRouter (paid) — last resort
 */

const LOG_PREFIX = '[21stAPI]'

// ── Types ──────────────────────────────────────────────────────────────────

export interface DeepThinkRequest {
  message: string
  context?: string
  maxTokens?: number
  temperature?: number
}

export interface DeepThinkResponse {
  content: string
  model: string
  usage: {
    inputTokens: number
    outputTokens: number
    thinkingTokens?: number
  }
  durationMs: number
}

export interface TokenResponse {
  token: string
  expiresAt: number
}

// ── Config ─────────────────────────────────────────────────────────────────

const API_KEY = process.env.TWENTYFIRST_API_KEY ?? ''
const BASE_URL = process.env.TWENTYFIRST_BASE_URL ?? 'https://api.21st.dev/v1'
const DEFAULT_MODEL = process.env.TWENTYFIRST_MODEL ?? 'thinking'
const DEFAULT_MAX_TOKENS = 8192
const DEFAULT_TEMPERATURE = 1.0 // 21st recommends 1.0 for thinking
const TIMEOUT_MS = 90_000

// Rate limiting: 1 req/min per user
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_WINDOW_MS = 60_000

// ── Availability ───────────────────────────────────────────────────────────

export function is21stAvailable(): boolean {
  return Boolean(API_KEY)
}

// ── Rate Limiting ──────────────────────────────────────────────────────────

export function checkRateLimit(userId: string): { allowed: boolean; retryAfterMs: number } {
  const lastRequest = rateLimitMap.get(userId)
  if (!lastRequest) return { allowed: true, retryAfterMs: 0 }

  const elapsed = Date.now() - lastRequest
  if (elapsed >= RATE_LIMIT_WINDOW_MS) return { allowed: true, retryAfterMs: 0 }

  return { allowed: false, retryAfterMs: RATE_LIMIT_WINDOW_MS - elapsed }
}

function recordRequest(userId: string): void {
  rateLimitMap.set(userId, Date.now())

  // Cleanup old entries every 100 records
  if (rateLimitMap.size > 100) {
    const now = Date.now()
    for (const [key, ts] of rateLimitMap) {
      if (now - ts > RATE_LIMIT_WINDOW_MS * 5) rateLimitMap.delete(key)
    }
  }
}

// ── Token Exchange ─────────────────────────────────────────────────────────

/**
 * Exchange API key for a session token.
 * Tokens are short-lived and scoped to a single session.
 */
export async function getSessionToken(): Promise<TokenResponse> {
  if (!API_KEY) throw new Error('TWENTYFIRST_API_KEY not configured')

  console.log(`${LOG_PREFIX} Exchanging API key for session token`)

  const res = await fetch(`${BASE_URL}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`21st token exchange failed: ${res.status} ${body}`)
  }

  const data = await res.json() as { token: string; expires_at?: number }
  return {
    token: data.token,
    expiresAt: data.expires_at ?? Date.now() + 3600_000,
  }
}

// ── Deep Thinking ──────────────────────────────────────────────────────────

/**
 * Send a deep thinking request to 21st API.
 * Returns the full response (non-streaming).
 */
export async function deepThink(
  request: DeepThinkRequest,
  userId: string,
): Promise<DeepThinkResponse> {
  if (!API_KEY) throw new Error('TWENTYFIRST_API_KEY not configured')

  // Check rate limit
  const { allowed, retryAfterMs } = checkRateLimit(userId)
  if (!allowed) {
    throw new Error(`Rate limited. Retry after ${Math.ceil(retryAfterMs / 1000)}s.`)
  }

  const startTime = Date.now()

  console.log(`${LOG_PREFIX} Deep think request: ${request.message.slice(0, 80)}... (${request.message.length} chars)`)

  const systemMessage = [
    'You are a deep reasoning assistant for a hedge fund (Priced In Capital).',
    'Provide thorough, well-reasoned analysis with clear logic chains.',
    'Focus on actionable insights for trading and market analysis.',
  ].join(' ')

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemMessage },
  ]

  if (request.context) {
    messages.push({ role: 'user', content: `Context:\n${request.context}` })
    messages.push({ role: 'assistant', content: 'I understand the context. Please provide your question.' })
  }

  messages.push({ role: 'user', content: request.message })

  const body = {
    model: DEFAULT_MODEL,
    messages,
    max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: request.temperature ?? DEFAULT_TEMPERATURE,
    stream: false,
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  recordRequest(userId)

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    console.error(`${LOG_PREFIX} Request failed: ${res.status} ${errBody}`)
    throw new Error(`21st API error: ${res.status}`)
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>
    model: string
    usage: { prompt_tokens: number; completion_tokens: number; thinking_tokens?: number }
  }

  const content = data.choices?.[0]?.message?.content ?? ''
  const durationMs = Date.now() - startTime

  console.log(`${LOG_PREFIX} Response: ${content.length} chars in ${durationMs}ms`)

  return {
    content,
    model: data.model ?? DEFAULT_MODEL,
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      thinkingTokens: data.usage?.thinking_tokens,
    },
    durationMs,
  }
}
