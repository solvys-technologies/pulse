// [claude-code 2026-03-10] Instrumented with cognition events + queue-aware requestId header
/**
 * AI Chat Handler
 * Handle chat messages and AI responses - OpenClaw Local Processing
 * Routes through P.I.C. agent network for local single-user mode
 */

import type { Context } from 'hono'
import { createUIMessageStreamResponse, streamText } from 'ai'
import { selectModel, createModelClient, logModelSelection, markProviderUnhealthy, getFallbackModel, setRuntimeGitHubToken, type AiModelKey } from '../../../services/ai/model-selector.js'
import * as conversationStore from '../../../services/ai/conversation-store.js'
import { defaultAiConfig } from '../../../config/ai-config.js'
import type { ChatRequest } from '../../../types/ai-chat.js'
import type { OpenClawAgentRole } from '../../../services/openclaw-service.js'
import { handleOpenClawChat, detectAgent, type ContentPart } from '../../../services/openclaw-handler.js'
import { exaSearch, formatExaContext, isExaAvailable } from '../../../services/exa-service.js'
import { extractSkillFromMessage, isSkillEnabled, getSkillDisabledReason } from '../../../config/feature-flags.js'
import { createRequestCognition } from '../../../services/cognition-emitter.js'
import { enqueue, completeJob } from '../../../services/chat-queue.js'

// Timeout for streaming responses (60 seconds)
const STREAM_TIMEOUT_MS = 60_000
const LOCAL_STREAM_CHUNK_SIZE = 72
const LOCAL_STREAM_CHUNK_DELAY_MS = Number(process.env.OPENCLAW_STREAM_CHUNK_DELAY_MS ?? '18')
const LOCAL_REASONING_CHUNK_SIZE = 52
const LOCAL_REASONING_CHUNK_DELAY_MS = Number(process.env.OPENCLAW_REASONING_CHUNK_DELAY_MS ?? '14')

// Check if we should use local OpenClaw processing
const USE_LOCAL_OPENCLAW = process.env.USE_LOCAL_OPENCLAW !== 'false'

function toAgentLabel(agent: OpenClawAgentRole): string {
  switch (agent) {
    case 'harper-cao':
      return 'Harper / CAO'
    case 'pma-1':
      return 'PMA-1'
    case 'pma-2':
      return 'PMA-2'
    case 'futures-desk':
      return 'Futures Desk'
    case 'fundamentals-desk':
      return 'Fundamentals Desk'
    default:
      return 'PIC Analyst'
  }
}

function buildLocalReasoningTrace(options: {
  agent: OpenClawAgentRole
  intent?: string
  userMessage: string
  symbols?: string[]
}): string {
  const { agent, intent, userMessage, symbols } = options
  const compactInput = userMessage.replace(/\s+/g, ' ').trim()
  const promptPreview = compactInput.length > 96 ? `${compactInput.slice(0, 96)}...` : compactInput
  const symbolText = symbols && symbols.length > 0 ? symbols.join(', ') : 'none detected'
  const intentText = intent || 'general'

  return [
    `Routing request to ${toAgentLabel(agent)} (${intentText}).`,
    `Context scan: symbols = ${symbolText}.`,
    `Applying P.I.C. risk and execution framework before final answer.`,
    `User prompt focus: "${promptPreview}".`,
  ].join('\n')
}

/**
 * POST /api/ai/chat
 * OpenClaw Local Processing - Routes through P.I.C. agent network
 */
export async function handleChat(c: Context) {
  const startTime = Date.now()
  const requestId = `chat-${Date.now()}-${Math.random().toString(36).substring(7)}`
  const userId = c.get('userId') as string | undefined

  // Pass user's GitHub OAuth token for GitHub Models (GPT-4o)
  const githubToken = c.req.header('X-GitHub-Token')
  setRuntimeGitHubToken(githubToken || undefined)

  // Create scoped cognition emitter — frontend subscribes via /api/ai/cognition/stream?requestId=
  const cognition = createRequestCognition(requestId, startTime)

  console.log(`[OpenClaw][${requestId}] Request started (local mode: ${USE_LOCAL_OPENCLAW}, github: ${Boolean(githubToken)})`)

  // Expose requestId so frontend can open cognition SSE stream
  c.header('X-Request-Id', requestId)

  if (!userId) {
    console.warn(`[OpenClaw][${requestId}] Unauthorized - no userId`)
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const body = await c.req.json<ChatRequest & { messages?: { role: string; content: string }[] }>().catch((err) => {
      console.error(`[OpenClaw][${requestId}] Failed to parse request body:`, err)
      return null
    })

    // Support both 'message' (string) and 'messages' (array from Vercel AI SDK)
    // Content can be string or multimodal array [{type:'text',text:''},{type:'image_url',image_url:{url:''}}]
    let message = body?.message?.trim() ?? ''
    let multimodalContent: ContentPart[] | undefined
    if (!message && body?.messages?.length) {
      const lastUserMsg = [...body.messages].reverse().find(m => m.role === 'user')
      const rawContent = lastUserMsg?.content
      if (typeof rawContent === 'string') {
        message = rawContent.trim()
      } else if (Array.isArray(rawContent)) {
        // Multimodal content array
        message = rawContent
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('')
          .trim()
        const hasImages = rawContent.some((p: any) => p.type === 'image_url')
        if (hasImages) {
          multimodalContent = rawContent as ContentPart[]
        }
      }
    }

    if (!message) {
      console.warn(`[OpenClaw][${requestId}] Empty message`)
      return c.json({ error: 'Message is required' }, 400)
    }

    // Enforce skill permissions
    const detectedSkill = extractSkillFromMessage(message)
    if (detectedSkill && !isSkillEnabled(detectedSkill)) {
      const reason = getSkillDisabledReason(detectedSkill) || 'This skill is currently disabled.'
      console.warn(`[OpenClaw][${requestId}] Blocked disabled skill: ${detectedSkill}`)
      cognition.step('skill-check', `Skill blocked: ${detectedSkill}`, reason)
      cognition.done()
      return c.json({ error: 'Skill unavailable', reason }, 403)
    }
    if (detectedSkill) {
      cognition.step('skill-check', `Skill active: ${detectedSkill}`)
    }

    console.log(`[OpenClaw][${requestId}] Message: "${message.substring(0, 50)}..." (${message.length} chars)`)

    const { conversationId, model, taskType, agentOverride, thinkHarder } = body ?? {} as any

    // Get or create conversation
    let conversation = conversationId
      ? await conversationStore.getConversation(conversationId, userId)
      : null

    if (conversationId && !conversation) {
      console.log(`[OpenClaw][${requestId}] Conversation ${conversationId} not found, creating new`)
      conversation = null
    }

    if (!conversation) {
      const title = conversationStore.generateTitle(message)
      conversation = await conversationStore.createConversation(userId, { title, model })
      console.log(`[OpenClaw][${requestId}] Created conversation: ${conversation.id}`)
    } else {
      console.log(`[OpenClaw][${requestId}] Using existing conversation: ${conversation.id}`)
    }

    // Store user message
    await conversationStore.addMessage(conversation.id, {
      conversationId: conversation.id,
      role: 'user',
      content: message,
    })
    console.log(`[OpenClaw][${requestId}] User message saved`)

    // Get conversation history
    const history = await conversationStore.getRecentContext(conversation.id)
    console.log(`[OpenClaw][${requestId}] History: ${history.length} messages`)
    cognition.step('context-build', `Context assembled`, `${history.length} messages in history`)

    // Detect which P.I.C. agent should handle this
    const agentInfo = detectAgent(message)
    console.log(`[OpenClaw][${requestId}] Routed to agent: ${agentInfo.agent} (intent: ${agentInfo.intent}, confidence: ${agentInfo.confidence})`)
    cognition.step(
      'agent-route',
      `Routed → ${toAgentLabel(agentInfo.agent)}`,
      `intent: ${agentInfo.intent}, confidence: ${Math.round(agentInfo.confidence * 100)}%`
    )

    // LOCAL OPENCLAW is always the primary path.
    // GitHub Models (GPT-4o) is available as a fallback when the Clawdbot gateway is down.
    // Only use GitHub Models if explicitly requested via model param.
    const useGitHubModel = Boolean(githubToken) && model === 'github-deepseek'

    // PRIMARY PATH: Local OpenClaw processing via P.I.C. agent network
    if (USE_LOCAL_OPENCLAW && !useGitHubModel) {
      console.log(`[OpenClaw][${requestId}] Using LOCAL processing via P.I.C. agents`)

      // Deep research via Exa when thinkHarder is enabled
      let researchContext = ''
      let researchSourceCount = 0
      if (thinkHarder && isExaAvailable()) {
        console.log(`[OpenClaw][${requestId}] ThinkHarder enabled — running Exa research`)
        cognition.step('tool-dispatch', 'Exa deep research', 'ThinkHarder enabled — searching live sources')
        const results = await exaSearch(message, { numResults: 5 })
        researchSourceCount = results.length
        researchContext = formatExaContext(results)
        if (researchContext) {
          console.log(`[OpenClaw][${requestId}] Exa returned ${results.length} sources`)
          cognition.step('tool-dispatch', `Exa: ${results.length} sources found`, results.map(r => (r as any).url ?? '').filter(Boolean).slice(0, 2).join(', '))
        }
      }

      // Augment message with research context if available
      const augmentedMessage = researchContext
        ? `${researchContext}\n\n${message}`
        : message

      // Generate response locally through OpenClaw
      cognition.step('gateway-call', 'Calling OpenClaw gateway', `model: clawdbot:main, agent: ${agentInfo.agent}`)
      const openclawResponse = await handleOpenClawChat({
        message: augmentedMessage,
        multimodalContent,
        conversationId: conversation.id,
        history: history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        agentOverride: agentOverride as OpenClawAgentRole | undefined,
        thinkHarder,
      })

      console.log(`[OpenClaw][${requestId}] Local response generated by ${openclawResponse.agent}`)
      cognition.step('response-ready', 'Response assembled', `${openclawResponse.content.length} chars, streaming now`)

      // Store assistant message
      await conversationStore.addMessage(conversation.id, {
        conversationId: conversation.id,
        role: 'assistant',
        content: openclawResponse.content,
        model: `openclaw-${openclawResponse.agent}`,
      })

      const duration = Date.now() - startTime
      console.log(`[OpenClaw][${requestId}] Response complete (${duration}ms, ${openclawResponse.content.length} chars)`)

      // Set conversation ID header
      c.header('X-Conversation-Id', conversation.id)
      c.header('X-OpenClaw-Agent', openclawResponse.agent)
      if (researchSourceCount > 0) {
        c.header('X-Research-Sources', String(researchSourceCount))
      }

      // Stream using AI SDK UI message event stream (SSE with JSON payloads).
      // This matches `DefaultChatTransport` on the frontend, which expects SSE JSON events.
      const uiMessageId = `assistant-${Date.now()}`
      const uiReasoningId = `reasoning-${Date.now()}`
      const content = openclawResponse.content
      const reasoningTrace = buildLocalReasoningTrace({
        agent: openclawResponse.agent,
        intent: openclawResponse.metadata?.intent,
        userMessage: message,
        symbols: openclawResponse.metadata?.symbols,
      })

      let cancelled = false
      const stream = new ReadableStream({
        start(controller) {
          ;(async () => {
            controller.enqueue({ type: 'reasoning-start', id: uiReasoningId })
            for (let i = 0; i < reasoningTrace.length; i += LOCAL_REASONING_CHUNK_SIZE) {
              if (cancelled) return
              controller.enqueue({
                type: 'reasoning-delta',
                id: uiReasoningId,
                delta: reasoningTrace.slice(i, i + LOCAL_REASONING_CHUNK_SIZE),
              })
              await new Promise((resolve) => setTimeout(resolve, LOCAL_REASONING_CHUNK_DELAY_MS))
            }
            controller.enqueue({ type: 'reasoning-end', id: uiReasoningId })

            controller.enqueue({ type: 'text-start', id: uiMessageId })
            for (let i = 0; i < content.length; i += LOCAL_STREAM_CHUNK_SIZE) {
              if (cancelled) return
              controller.enqueue({
                type: 'text-delta',
                id: uiMessageId,
                delta: content.slice(i, i + LOCAL_STREAM_CHUNK_SIZE),
              })
              // Keep deltas incremental so UI renders as a stream.
              await new Promise((resolve) => setTimeout(resolve, LOCAL_STREAM_CHUNK_DELAY_MS))
            }

            if (!cancelled) {
              controller.enqueue({ type: 'text-end', id: uiMessageId })
              cognition.done()
              controller.close()
            }
          })().catch((error) => {
            console.error(`[OpenClaw][${requestId}] Local stream error:`, error)
            cognition.step('error', 'Stream error', error instanceof Error ? error.message : String(error))
            cognition.done()
            if (!cancelled) controller.error(error)
          })
        },
        cancel() {
          cancelled = true
        },
      })

      return createUIMessageStreamResponse({
        stream,
        headers: {
          'X-Conversation-Id': conversation.id,
          'X-OpenClaw-Agent': openclawResponse.agent,
          'Access-Control-Allow-Origin': c.req.header('Origin') || '*',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Expose-Headers': 'X-Conversation-Id, X-OpenClaw-Agent',
        }
      })
    }

    // External API — GitHub Models (GPT-4o) fallback when explicitly requested
    const preferredModel = useGitHubModel ? 'github-deepseek' : model
    console.log(`[OpenClaw][${requestId}] Using external API (preferred: ${preferredModel ?? 'auto'})`)

    // Select model based on agent task type
    const selection = selectModel({
      preferredModel,
      taskType: agentInfo.intent || taskType || 'chat',
      messageCount: history.length,
      inputChars: message.length,
    })

    logModelSelection(selection, { preferredModel, taskType })
    console.log(`[OpenClaw][${requestId}] Selected model: ${selection.model} (provider: ${selection.provider})`)

    const systemPrompt = defaultAiConfig.systemPrompt ?? 'You are a helpful AI trading assistant.'

    let aiModel
    try {
      aiModel = createModelClient(selection.model as AiModelKey)
      console.log(`[OpenClaw][${requestId}] Model client created successfully`)
    } catch (err) {
      console.error(`[OpenClaw][${requestId}] Failed to create model client:`, err)

      // When GitHub model was explicitly selected, don't silently fallback — return clean error
      if (useGitHubModel) {
        return c.json({
          error: 'Connected but error — GPT-4o via GitHub Models is unavailable right now.',
          requestId,
        }, 503)
      }

      // Try fallback model for non-GitHub routes
      const fallback = getFallbackModel(selection.model as AiModelKey)
      if (fallback) {
        console.log(`[OpenClaw][${requestId}] Trying fallback model: ${fallback.model}`)
        markProviderUnhealthy(selection.provider)
        aiModel = createModelClient(fallback.model as AiModelKey)
      } else {
        throw err
      }
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history,
      { role: 'user' as const, content: message },
    ]

    console.log(`[OpenClaw][${requestId}] Calling streamText with ${messages.length} messages`)

    // Track streaming progress
    let chunksReceived = 0
    let totalChars = 0
    let lastChunkTime = Date.now()

    // Stream response using Vercel AI SDK
    const result = streamText({
      model: aiModel,
      messages,
      temperature: 0.4,
      maxOutputTokens: 4096,
      abortSignal: AbortSignal.timeout(STREAM_TIMEOUT_MS),
      onChunk: ({ chunk }) => {
        chunksReceived++
        const now = Date.now()
        const timeSinceLastChunk = now - lastChunkTime
        lastChunkTime = now

        if (chunksReceived % 10 === 0 || timeSinceLastChunk > 5000) {
          console.log(`[OpenClaw][${requestId}] Chunk #${chunksReceived}, gap: ${timeSinceLastChunk}ms`)
        }

        if (chunk.type === 'text-delta' && chunk.text) {
          totalChars += chunk.text.length
        }
      },
      onFinish: async ({ text, finishReason, usage }) => {
        const duration = Date.now() - startTime
        console.log(`[OpenClaw][${requestId}] Stream finished (${duration}ms, ${text.length} chars)`)

        // Store assistant message
        try {
          await conversationStore.addMessage(conversation!.id, {
            conversationId: conversation!.id,
            role: 'assistant',
            content: text,
            model: selection.model,
          })
        } catch (saveErr) {
          console.error(`[OpenClaw][${requestId}] Failed to save message:`, saveErr)
        }
      },
    })

    c.header('X-Conversation-Id', conversation.id)

    return result.toUIMessageStreamResponse({
      headers: {
        'X-Conversation-Id': conversation.id,
        'X-Request-Id': requestId,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[OpenClaw][${requestId}] Fatal error after ${duration}ms:`, error)
    cognition.step('error', 'Fatal error', error instanceof Error ? error.message : String(error))
    cognition.done()

    // Clean error messages — no raw fallback info
    let errorMessage = 'Connected but error — try again in a moment.'
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.'
      } else if (error.message.includes('API key') || error.message.includes('authentication')) {
        errorMessage = 'Connected but error — check model configuration.'
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment.'
      } else if (error.message.includes('GitHub Models')) {
        errorMessage = 'Connected but error — GPT-4o is temporarily unavailable.'
      }
    }

    return c.json({
      error: errorMessage,
      requestId,
      duration: `${duration}ms`,
    }, 500)
  }
}

/**
 * POST /api/ai/chat/stream (legacy SSE endpoint)
 */
export async function handleChatStream(c: Context) {
  // Redirect to main handler - it's now streaming
  return handleChat(c)
}
