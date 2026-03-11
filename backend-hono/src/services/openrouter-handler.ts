// [claude-code 2026-03-11] OpenRouter Handler — replaces OpenClaw handler for Windows cross-platform
/**
 * OpenRouter Chat Handler
 * Orchestration layer for P.I.C. (Priced In Capital)
 * Routes messages through OpenRouter API (Claude Opus 4.6)
 *
 * Architecture: User Message → Agent Detection → OpenRouter → Response
 */

import type { OpenClawAgentRole } from './openrouter-service.js'
import { createOpenRouterClient, OPENROUTER_MODELS } from './openrouter-service.js'
import { getAgentSystemPrompt, extractSkillTag } from './ai/agent-instructions.js'

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface OpenClawMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentPart[]
}

export interface OpenClawChatRequest {
  message: string
  multimodalContent?: ContentPart[]
  conversationId?: string
  history?: OpenClawMessage[]
  agentOverride?: OpenClawAgentRole
  thinkHarder?: boolean
}

export interface OpenClawChatResponse {
  content: string
  agent: OpenClawAgentRole
  confidence: number
  metadata?: {
    intent: string
    symbols?: string[]
    tradeDirection?: 'long' | 'short' | 'flat'
    riskLevel?: 'low' | 'medium' | 'high'
  }
}

// Intent detection patterns (same as original)
const INTENT_PATTERNS: { pattern: RegExp; agent: OpenClawAgentRole; intent: string }[] = [
  // Harper/CAO triggers
  { pattern: /\b(earnings.?review|er.?journal|earnings.?journal|post.?earnings.?review)\b/i, agent: 'harper-cao', intent: 'earnings-psych' },
  { pattern: /\b(mdb|morning.?daily.?brief|daily.?report|morning.?brief)/i, agent: 'harper-cao', intent: 'mdb-report' },
  { pattern: /\b(trade.?approval|approve|reject|consolidat)/i, agent: 'harper-cao', intent: 'approval' },
  { pattern: /\b(commandment|rule|13|trading.?rules)/i, agent: 'harper-cao', intent: 'rules' },
  { pattern: /\b(psych|tilt|emotion|mental|eval)/i, agent: 'harper-cao', intent: 'psych-eval' },
  { pattern: /\b(tale.?of.?the.?tape|weekly|recap)/i, agent: 'harper-cao', intent: 'weekly-recap' },
  // PMA-1 triggers (S&P/Crypto)
  { pattern: /\b(spy|spx|s&?p|es|nasdaq|qqq|nq)\b/i, agent: 'pma-1', intent: 'sp-analysis' },
  { pattern: /\b(btc|bitcoin|eth|ethereum|crypto)\b/i, agent: 'pma-1', intent: 'crypto-analysis' },
  { pattern: /\b(kalshi|prediction.?market|probability)\b/i, agent: 'pma-1', intent: 'prediction-market' },
  // PMA-2 triggers (Econ/Political)
  { pattern: /\b(fed|fomc|rate|inflation|cpi|ppi)\b/i, agent: 'pma-2', intent: 'fed-analysis' },
  { pattern: /\b(election|political|policy|tariff)\b/i, agent: 'pma-2', intent: 'political-analysis' },
  { pattern: /\b(gdp|employment|jobs|unemployment)\b/i, agent: 'pma-2', intent: 'econ-analysis' },
  // Futures Desk triggers
  { pattern: /(\/nq|\/mnq|\/es|futures|topstep)/i, agent: 'futures-desk', intent: 'futures-trade' },
  { pattern: /\b(fa.?ripper|ripper|setup|entry|exit)\b/i, agent: 'futures-desk', intent: 'setup-analysis' },
  { pattern: /\b(technical|chart|support|resistance|ema|vwap)\b/i, agent: 'futures-desk', intent: 'technical' },
  // Fundamentals Desk triggers
  { pattern: /\b(aapl|apple|msft|microsoft|nvda|nvidia|googl|google|meta|amzn|amazon|tsla|tesla)\b/i, agent: 'fundamentals-desk', intent: 'stock-analysis' },
  { pattern: /\b(earnings|guidance|revenue|margin|pe|valuation)\b/i, agent: 'fundamentals-desk', intent: 'earnings' },
  { pattern: /\b(mega.?cap|mag.?7|big.?tech)\b/i, agent: 'fundamentals-desk', intent: 'megacap' },
]

// Symbol extraction patterns
const SYMBOL_PATTERNS = [
  /\$([A-Z]{1,5})/g,
  /\b([A-Z]{2,5})\b(?=.*(?:stock|share|price|trade|buy|sell))/gi,
  /\b(\/[A-Z]{2,3})\b/g,
  /\b(BTC|ETH|SOL|DOGE)\b/gi,
]

/**
 * Detect which P.I.C. agent should handle the message
 */
export function detectAgent(message: string): { agent: OpenClawAgentRole; intent: string; confidence: number } {
  for (const { pattern, agent, intent } of INTENT_PATTERNS) {
    if (pattern.test(message)) {
      return { agent, intent, confidence: 0.85 }
    }
  }
  return { agent: 'harper-cao', intent: 'general', confidence: 0.6 }
}

/**
 * Extract symbols from message
 */
export function extractSymbols(message: string): string[] {
  const symbols = new Set<string>()
  for (const pattern of SYMBOL_PATTERNS) {
    const matches = message.matchAll(pattern)
    for (const match of matches) {
      symbols.add(match[1].toUpperCase())
    }
  }
  return Array.from(symbols)
}

/**
 * Main handler — routes through OpenRouter API (Claude Opus 4.6)
 */
export async function handleOpenClawChat(request: OpenClawChatRequest): Promise<OpenClawChatResponse> {
  const agentInfo = request.agentOverride
    ? { agent: request.agentOverride, intent: 'override', confidence: 1.0 }
    : detectAgent(request.message)

  // Build messages array
  const skillTag = extractSkillTag(request.message)
  const systemPrompt = getAgentSystemPrompt(agentInfo.agent, { skillTag, thinkHarder: request.thinkHarder })
  const messages: { role: string; content: string | ContentPart[] }[] = [
    { role: 'system', content: systemPrompt }
  ]

  if (request.history?.length) {
    messages.push(...request.history.map(h => ({ role: h.role, content: h.content })))
  }

  if (request.multimodalContent?.length) {
    messages.push({ role: 'user', content: request.multimodalContent })
  } else {
    messages.push({ role: 'user', content: request.message })
  }

  const apiKey = process.env.OPENROUTER_API_KEY ?? ''
  if (!apiKey) {
    console.warn('[OpenRouter] No API key — using local fallback')
    return generateLocalResponse(request, agentInfo)
  }

  console.log(`[OpenRouter] Calling API with ${messages.length} messages (agent: ${agentInfo.agent})`)

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_APP_URL ?? 'https://pulse-solvys.vercel.app',
        'X-Title': process.env.OPENROUTER_APP_NAME ?? 'Pulse-PIC-Gateway',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODELS.PRIMARY,
        messages,
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[OpenRouter] API error ${response.status}: ${errorText}`)

      // Try fallback model on primary failure
      if (response.status === 429 || response.status >= 500) {
        return await tryFallbackModels(messages, request, agentInfo)
      }

      return generateLocalResponse(request, agentInfo)
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[]
    }
    const content = data.choices?.[0]?.message?.content ?? ''

    if (!content) {
      console.warn('[OpenRouter] Empty response, using local fallback')
      return generateLocalResponse(request, agentInfo)
    }

    console.log(`[OpenRouter] Response received: ${content.substring(0, 50)}...`)

    return {
      content,
      agent: agentInfo.agent,
      confidence: agentInfo.confidence,
      metadata: {
        intent: agentInfo.intent,
        symbols: extractSymbols(request.message)
      }
    }
  } catch (error) {
    console.error('[OpenRouter] Request failed:', error)
    return generateLocalResponse(request, agentInfo)
  }
}

/**
 * Try fallback models (Sonnet → Haiku) when primary fails
 */
async function tryFallbackModels(
  messages: { role: string; content: string | ContentPart[] }[],
  request: OpenClawChatRequest,
  agentInfo: { agent: OpenClawAgentRole; intent: string; confidence: number }
): Promise<OpenClawChatResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? ''
  const fallbacks = [OPENROUTER_MODELS.FALLBACK, OPENROUTER_MODELS.LAST_RESORT]

  for (const model of fallbacks) {
    try {
      console.log(`[OpenRouter] Trying fallback model: ${model}`)
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.OPENROUTER_APP_URL ?? 'https://pulse-solvys.vercel.app',
          'X-Title': process.env.OPENROUTER_APP_NAME ?? 'Pulse-PIC-Gateway',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages })
      })

      if (!response.ok) continue

      const data = await response.json() as {
        choices?: { message?: { content?: string } }[]
      }
      const content = data.choices?.[0]?.message?.content
      if (content) {
        console.log(`[OpenRouter] Fallback ${model} succeeded`)
        return {
          content,
          agent: agentInfo.agent,
          confidence: agentInfo.confidence,
          metadata: { intent: agentInfo.intent, symbols: extractSymbols(request.message) }
        }
      }
    } catch {
      continue
    }
  }

  return generateLocalResponse(request, agentInfo)
}

/**
 * Stream response (compatibility with streaming endpoints)
 */
export async function* streamOpenClawChat(request: OpenClawChatRequest): AsyncGenerator<string> {
  const response = await handleOpenClawChat(request)
  const content = response.content
  const chunkSize = 20
  for (let i = 0; i < content.length; i += chunkSize) {
    yield content.slice(i, i + chunkSize)
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

// ── Local fallback response generators ──────────────────────────────

function generateLocalResponse(
  request: OpenClawChatRequest,
  agentInfo: { agent: OpenClawAgentRole; intent: string; confidence: number }
): OpenClawChatResponse {
  const { agent, intent } = agentInfo
  const symbols = extractSymbols(request.message)

  let content: string
  switch (intent) {
    case 'mdb-report':
      content = `## MDB Report - ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\n\n*OpenRouter API unavailable. Connect your OPENROUTER_API_KEY for full AI analysis.*\n\n### Agent Status\n- Harper/CAO: Standing by\n- All desks: Ready\n\n**Run again when API is connected for full report.**`
      break
    case 'weekly-recap':
      content = `## Tale of the Tape - Weekly Summary\n\n*OpenRouter API unavailable. Connect your OPENROUTER_API_KEY for full analysis.*\n\n### Quick Status\n- ER: Stable\n- Discipline: Pending eval\n\n**Reconnect and retry for full weekly analysis.**`
      break
    case 'psych-eval':
      content = `## Psychological Evaluation\n\n*OpenRouter API unavailable. Connect your OPENROUTER_API_KEY for full eval.*\n\n### Check-In\n1. How are you feeling about today's market?\n2. Any revenge trading urges?\n3. Following your trading plan?\n\n> "There is always another trade" (Rule 1)`
      break
    default:
      content = `## ${toAgentLabel(agent)} Response\n\n*OpenRouter API unavailable — running in offline mode.*\n\nConnect your OPENROUTER_API_KEY in Settings or .env to enable Claude Opus 4.6 analysis.\n\n**Available commands:**\n- "Run the MDB report"\n- "What's the setup on /NQ?"\n- "Check my ER status"`
  }

  return {
    content,
    agent,
    confidence: agentInfo.confidence,
    metadata: { intent, symbols: symbols.length > 0 ? symbols : undefined }
  }
}

function toAgentLabel(agent: OpenClawAgentRole): string {
  switch (agent) {
    case 'harper-cao': return 'Harper / CAO'
    case 'pma-1': return 'PMA-1'
    case 'pma-2': return 'PMA-2'
    case 'futures-desk': return 'Futures Desk'
    case 'fundamentals-desk': return 'Fundamentals Desk'
    default: return 'PIC Analyst'
  }
}
