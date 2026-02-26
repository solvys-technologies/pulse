/**
 * OpenClaw Local Handler
 * LOCAL orchestration layer for P.I.C. (Priced In Capital)
 * Processes messages through agent logic WITHOUT external API calls
 *
 * Architecture: User Message → OpenClaw → P.I.C. Agent → Response
 */

import type { OpenClawAgentRole } from './openclaw-service.js'

export interface OpenClawMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface OpenClawChatRequest {
  message: string
  conversationId?: string
  history?: OpenClawMessage[]
  agentOverride?: OpenClawAgentRole
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

// P.I.C. Agent system prompts
const AGENT_PROMPTS: Record<OpenClawAgentRole, string> = {
  'harper-cao': `You are Harper, the Chief Agentic Officer (CAO) of Priced In Capital.
You oversee all trading operations and provide executive-level guidance.
You consolidate reports from PMA agents, Futures Desk, and Fundamentals Desk.
Your role: Macro oversight, trade approvals, risk consolidation.
Speak with authority and strategic vision. Reference the 13 Commandments when relevant.`,

  'pma-1': `You are PMA-1, the S&P 500 & Crypto prediction market analyst.
You specialize in Kalshi prediction markets for S&P/crypto price movements.
Track ES futures, BTC, and related prediction contracts.
Provide probability assessments and market-timing insights.`,

  'pma-2': `You are PMA-2, the Economic & Political prediction market analyst.
You specialize in Kalshi prediction markets for economic and political events.
Track Fed decisions, elections, policy changes affecting markets.
Provide probability assessments for macro events.`,

  'futures-desk': `You are the Futures Desk analyst at Priced In Capital.
You trade /NQ, /MNQ, /ES via TopStepX.
Focus on technical analysis, FA Rippers, and intraday setups.
Identify entry/exit levels, stops, and risk/reward ratios.`,

  'fundamentals-desk': `You are the Fundamentals Desk analyst at Priced In Capital.
You cover the Top 10 S&P/NDX mega-cap tech stocks.
Track earnings, guidance, sector trends, and long-term catalysts.
Provide fundamental analysis and fair value assessments.`
}

// Intent detection patterns
const INTENT_PATTERNS: { pattern: RegExp; agent: OpenClawAgentRole; intent: string }[] = [
  // Harper/CAO triggers
  { pattern: /\b(ntn|need.?to.?know|daily.?report|morning.?brief)/i, agent: 'harper-cao', intent: 'ntn-report' },
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
  /\$([A-Z]{1,5})/g,                    // $AAPL, $NVDA
  /\b([A-Z]{2,5})\b(?=.*(?:stock|share|price|trade|buy|sell))/gi, // AAPL stock
  /\b(\/[A-Z]{2,3})\b/g,                // /NQ, /ES, /MNQ
  /\b(BTC|ETH|SOL|DOGE)\b/gi            // Crypto
]

/**
 * Detect which P.I.C. agent should handle the message
 */
export function detectAgent(message: string): { agent: OpenClawAgentRole; intent: string; confidence: number } {
  const lowerMessage = message.toLowerCase()

  // Check patterns
  for (const { pattern, agent, intent } of INTENT_PATTERNS) {
    if (pattern.test(message)) {
      return { agent, intent, confidence: 0.85 }
    }
  }

  // Default to Harper/CAO for general queries
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
 * Generate response based on agent persona and message context
 * This is the LOCAL processing - no external API calls
 */
export function generateLocalResponse(
  request: OpenClawChatRequest,
  agentInfo: { agent: OpenClawAgentRole; intent: string; confidence: number }
): OpenClawChatResponse {
  const { agent, intent } = agentInfo
  const symbols = extractSymbols(request.message)
  const agentPrompt = AGENT_PROMPTS[agent]

  // Build contextual response based on intent
  let content: string
  let tradeDirection: 'long' | 'short' | 'flat' | undefined
  let riskLevel: 'low' | 'medium' | 'high' | undefined

  switch (intent) {
    case 'ntn-report':
      content = generateNTNReport()
      break

    case 'weekly-recap':
      content = generateWeeklyRecap()
      break

    case 'psych-eval':
      content = generatePsychEval()
      break

    case 'rules':
      content = generateRulesResponse(request.message)
      break

    case 'futures-trade':
    case 'setup-analysis':
      content = generateFuturesAnalysis(symbols, request.message)
      tradeDirection = 'flat'
      riskLevel = 'medium'
      break

    case 'stock-analysis':
    case 'earnings':
    case 'megacap':
      content = generateFundamentalsAnalysis(symbols, request.message)
      break

    case 'prediction-market':
    case 'sp-analysis':
    case 'crypto-analysis':
      content = generatePMAAnalysis(agent, symbols, request.message)
      break

    case 'fed-analysis':
    case 'political-analysis':
    case 'econ-analysis':
      content = generateMacroAnalysis(intent, request.message)
      break

    default:
      content = generateGeneralResponse(agent, request.message)
  }

  return {
    content,
    agent,
    confidence: agentInfo.confidence,
    metadata: {
      intent,
      symbols: symbols.length > 0 ? symbols : undefined,
      tradeDirection,
      riskLevel
    }
  }
}

// Response generators for different intents

function generateNTNReport(): string {
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `## 📋 NTN Report - ${time}

### Market Status
- **Session**: Pre-market / Regular Hours / After Hours
- **ES Futures**: Awaiting data sync
- **VIX**: Monitoring volatility levels

### Agent Check-In
- **Harper/CAO**: Operational ✅
- **PMA-1 (S&P/Crypto)**: Standing by
- **PMA-2 (Econ/Politics)**: Monitoring calendar
- **Futures Desk**: Ready for setups
- **Fundamentals Desk**: Tracking mega-caps

### Today's Focus
*OpenClaw is now connected locally. Agent pipeline ready.*

**Next Steps**: Run "Check the Tape" for real-time market data, or ask about specific setups.`
}

function generateWeeklyRecap(): string {
  return `## 📊 Tale of the Tape - Weekly Summary

### Performance Overview
*Connecting to trading journal...*

### Key Trades
- Awaiting trade log sync from TopStepX/Kalshi

### ER Status
- Emotional Resilience: **Stable**
- Tilt Events: 0
- Discipline Score: Pending eval

### Lessons Learned
1. Follow the 13 Commandments
2. Good traders buy from good prices (Rule 8)
3. No shot in the dark trades (Rule 3)

*Full analytics available once trading data is synced.*`
}

function generatePsychEval(): string {
  return `## 🧠 Psychological Evaluation

### Current State Assessment
- **Emotional Baseline**: Neutral
- **Tilt Risk**: Low
- **Trading Readiness**: Evaluating...

### Check-In Questions
1. How are you feeling about today's market?
2. Any revenge trading urges from recent losses?
3. Are you following your trading plan?

### Commandment Reminder
> "There is always another trade" (Rule 1)
> "Be right or be right out" (Rule 12)

*Share your thoughts and I'll provide a detailed assessment.*`
}

function generateRulesResponse(message: string): string {
  const commandments = [
    "1. There is always another trade",
    "2. The markets will always trade",
    "3. No 'shot in the dark' trades",
    "4. You can not go broke taking profits",
    "5. Know what tape you're trading",
    "6. You never need to make back losses the same way you lost them",
    "7. No doubling down on losers",
    "8. Good traders buy from good prices",
    "9. Good things happen to traders who wait",
    "10. Only fight for things worth fighting for",
    "11. Some days there is nothing to do",
    "12. Be right or be right out",
    "13. There is always another trade"
  ]

  return `## 📜 The 13 Commandments of P.I.C.

${commandments.join('\n')}

---
*These rules define our trading discipline. Which one would you like to discuss?*`
}

function generateFuturesAnalysis(symbols: string[], message: string): string {
  const futures = symbols.filter(s => s.startsWith('/'))
  const symbol = futures[0] || '/NQ'

  return `## 📈 Futures Desk Analysis: ${symbol}

### Technical Levels (Pending Data Sync)
- **Current Price**: Awaiting feed
- **Daily High/Low**: --
- **VWAP**: --
- **EMA 9/21/50**: --

### Setup Assessment
*FA Ripper scan pending market data connection*

### Trade Thesis
- Direction: **Awaiting confirmation**
- Entry Zone: TBD
- Stop: TBD (Rule 12: Be right or be right out)
- Target: Minimum 2:1 R:R (Rule 8)

### Risk Check
- Position sizing: Follow max loss rules
- Conviction level: Needs more data

*Connect TopStepX data for live analysis.*`
}

function generateFundamentalsAnalysis(symbols: string[], message: string): string {
  const symbol = symbols[0] || 'TECH'

  return `## 🔬 Fundamentals Desk: ${symbol}

### Company Overview
*Pulling fundamental data...*

### Key Metrics (Last Quarter)
- Revenue: Awaiting data
- EPS: Awaiting data
- Guidance: Awaiting data

### Catalyst Calendar
- Next earnings: Check investor relations
- Key events: Monitoring news flow

### Fair Value Assessment
*Valuation model requires financial data sync*

### Investment Thesis
**Current View**: Awaiting analysis completion

*For real-time fundamentals, ensure data feeds are connected.*`
}

function generatePMAAnalysis(agent: OpenClawAgentRole, symbols: string[], message: string): string {
  const focus = agent === 'pma-1' ? 'S&P 500 & Crypto' : 'Economic & Political'

  return `## 🎯 ${agent.toUpperCase()} Analysis: ${focus}

### Prediction Market Overview
*Connecting to Kalshi...*

### Current Probabilities
- Awaiting live contract data
- Check active markets for opportunities

### Market Sentiment
- **Bias**: Neutral (pending data)
- **Conviction**: Low (needs confirmation)

### Trade Ideas
*Scan for high-probability setups once data syncs*

### Risk Assessment
- Max position: Follow bankroll management
- Correlation check: Watch related markets

*Connect Kalshi API for live prediction market data.*`
}

function generateMacroAnalysis(intent: string, message: string): string {
  const topic = intent === 'fed-analysis' ? 'Federal Reserve' :
    intent === 'political-analysis' ? 'Political Events' : 'Economic Data'

  return `## 🌐 Macro Analysis: ${topic}

### Current Environment
*Monitoring macro conditions...*

### Key Events
- Fed meeting schedule: Check calendar
- Economic releases: Pending data sync
- Political developments: Monitoring

### Market Implications
*Analysis requires connected data feeds*

### Trading Impact
- Volatility expectation: Moderate
- Position adjustments: None recommended yet

*For real-time macro analysis, connect to news and economic data feeds.*`
}

function generateGeneralResponse(agent: OpenClawAgentRole, message: string): string {
  const agentName = {
    'harper-cao': 'Harper (CAO)',
    'pma-1': 'PMA-1',
    'pma-2': 'PMA-2',
    'futures-desk': 'Futures Desk',
    'fundamentals-desk': 'Fundamentals Desk'
  }[agent]

  return `## ${agentName} Response

I'm ${agentName}, part of the OpenClaw P.I.C. agent network.

Your message has been received. Here's what I can help with:

**My Capabilities:**
${agent === 'harper-cao' ? '- NTN Reports & Daily Briefings\n- Trade Approvals\n- Psych Evaluations\n- Trading Rules & Discipline' : ''}
${agent === 'pma-1' ? '- S&P 500 prediction markets\n- Crypto analysis\n- Kalshi contract evaluation' : ''}
${agent === 'pma-2' ? '- Fed/FOMC analysis\n- Political event impact\n- Economic data interpretation' : ''}
${agent === 'futures-desk' ? '- /NQ, /ES, /MNQ trading\n- FA Ripper setups\n- Technical analysis' : ''}
${agent === 'fundamentals-desk' ? '- Mega-cap tech analysis\n- Earnings deep-dives\n- Valuation models' : ''}

**Try asking:**
- "Run the NTN report"
- "What's the setup on /NQ?"
- "Check my ER status"

*OpenClaw local processing is active.*`
}

/**
 * Main handler for OpenClaw - routes through Clawdbot gateway
 */
export async function handleOpenClawChat(request: OpenClawChatRequest): Promise<OpenClawChatResponse> {
  // Detect agent and intent
  const agentInfo = request.agentOverride
    ? { agent: request.agentOverride, intent: 'override', confidence: 1.0 }
    : detectAgent(request.message)

  // Build messages array for the gateway
  const systemPrompt = AGENT_PROMPTS[agentInfo.agent]
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt }
  ]

  // Add conversation history if provided
  if (request.history?.length) {
    messages.push(...request.history.map(h => ({ role: h.role, content: h.content })))
  }

  // Add current user message
  messages.push({ role: 'user', content: request.message })

  // Call Clawdbot gateway
  const normalizeGatewayBaseUrl = (value: string): string => {
    const trimmed = value.trim().replace(/\/+$/, '')
    // Allow passing either http://host:port or http://host:port/v1
    return trimmed.endsWith('/v1') ? trimmed.slice(0, -3) : trimmed
  }

  const gatewayUrl = normalizeGatewayBaseUrl(
    process.env.OPENCLAW_BASE_URL ?? 'http://localhost:18789'
  )
  const apiKey = process.env.OPENCLAW_API_KEY ?? ''

  console.log(`[OpenClaw] Calling gateway at ${gatewayUrl} with ${messages.length} messages`)

  try {
    const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-OpenClaw-App': process.env.OPENCLAW_APP_NAME ?? 'Pulse-PIC-Gateway',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'clawdbot:main',
        messages
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[OpenClaw] Gateway error ${response.status}: ${errorText}`)
      // Fall back to local response on gateway error
      return generateLocalResponse(request, agentInfo)
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[]
    }
    const content = data.choices?.[0]?.message?.content ?? ''

    if (!content) {
      console.warn('[OpenClaw] Empty response from gateway, using local fallback')
      return generateLocalResponse(request, agentInfo)
    }

    console.log(`[OpenClaw] Gateway response received: ${content.substring(0, 50)}...`)

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
    console.error('[OpenClaw] Gateway request failed:', error)
    // Fall back to local response on network error
    return generateLocalResponse(request, agentInfo)
  }
}

/**
 * Stream OpenClaw response (for compatibility with streaming endpoints)
 */
export async function* streamOpenClawChat(request: OpenClawChatRequest): AsyncGenerator<string> {
  const response = await handleOpenClawChat(request)

  // Simulate streaming by yielding chunks
  const content = response.content
  const chunkSize = 20

  for (let i = 0; i < content.length; i += chunkSize) {
    yield content.slice(i, i + chunkSize)
    // Small delay to simulate streaming
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}
