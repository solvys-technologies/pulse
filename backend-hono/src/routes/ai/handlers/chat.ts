// [claude-code 2026-03-11] Removed LOCAL_OPENCLAW path, all chat routes through OpenRouter (Claude Opus 4.6)
/**
 * AI Chat Handler
 * Handle chat messages and AI responses via OpenRouter
 * Routes through P.I.C. agent network for agent detection/routing
 *
 * Inference priority chain:
 *   1. OpenRouter (Claude Opus 4.6) — default for all chat
 *   2. Claude SDK Bridge (Opus, free via Max) — for thinkHarder or explicit claude-local model
 *   3. 21st API (deep thinking fallback) — when Claude SDK unavailable + thinkHarder
 *   4. GitHub Models (GPT-4o) — explicit selection only
 */

import type { Context } from 'hono'
import { createUIMessageStreamResponse, streamText } from 'ai'
import { selectModel, createModelClient, logModelSelection, markProviderUnhealthy, getFallbackModel, setRuntimeGitHubToken, type AiModelKey } from '../../../services/ai/model-selector.js'
import * as conversationStore from '../../../services/ai/conversation-store.js'
import { defaultAiConfig } from '../../../config/ai-config.js'
import type { ChatRequest } from '../../../types/ai-chat.js'
import type { OpenClawAgentRole } from '../../../services/openrouter-service.js'
import { detectAgent, extractSymbols, type ContentPart } from '../../../services/openrouter-handler.js'
import { exaSearch, formatExaContext, isExaAvailable } from '../../../services/exa-service.js'
import { extractSkillFromMessage, isSkillEnabled, getSkillDisabledReason } from '../../../config/feature-flags.js'
import { createRequestCognition } from '../../../services/cognition-emitter.js'
import { enqueue, completeJob } from '../../../services/chat-queue.js'
import { isBridgeAvailable, bridgeChat, type BridgeStreamEvent } from '../../../services/claude-sdk/bridge.js'
import { deepThink, is21stAvailable } from '../../../services/twenty-first/deep-think.js'
import { resolveModelKey } from '../../../config/ai-config.js'
import { getAgentSystemPrompt, extractSkillTag } from '../../../services/ai/agent-instructions.js'

// File attachment content part types
type FileContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'file'; file: { name: string; mimeType: string; data: string } }

const STREAM_TIMEOUT_MS = 60_000

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

/**
 * POST /api/ai/chat
 * OpenRouter Processing - Routes through Claude Opus 4.6
 */
export async function handleChat(c: Context) {
  const startTime = Date.now()
  const requestId = `chat-${Date.now()}-${Math.random().toString(36).substring(7)}`
  const userId = c.get('userId') as string | undefined

  const githubToken = c.req.header('X-GitHub-Token')
  setRuntimeGitHubToken(githubToken || undefined)

  const cognition = createRequestCognition(requestId, startTime)

  console.log(`[Chat][${requestId}] Request started (github: ${Boolean(githubToken)})`)
  c.header('X-Request-Id', requestId)

  if (!userId) {
    console.warn(`[Chat][${requestId}] Unauthorized - no userId`)
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const body = await c.req.json<ChatRequest & { messages?: { role: string; content: string }[] }>().catch((err) => {
      console.error(`[Chat][${requestId}] Failed to parse request body:`, err)
      return null
    })

    let message = body?.message?.trim() ?? ''
    let multimodalContent: ContentPart[] | undefined
    if (!message && body?.messages?.length) {
      const lastUserMsg = [...body.messages].reverse().find(m => m.role === 'user')
      const rawContent = lastUserMsg?.content
      if (typeof rawContent === 'string') {
        message = rawContent.trim()
      } else if (Array.isArray(rawContent)) {
        const textParts: string[] = []
        const fileParts: string[] = []
        const imageParts: ContentPart[] = []

        for (const part of rawContent as FileContentPart[]) {
          if (part.type === 'text') {
            textParts.push(part.text)
          } else if (part.type === 'image_url') {
            imageParts.push(part as ContentPart)
          } else if (part.type === 'file' && part.file) {
            const { name, mimeType, data } = part.file
            if (mimeType.startsWith('image/')) {
              imageParts.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${data}` } })
            } else if (
              mimeType.startsWith('text/') ||
              mimeType === 'application/json' ||
              mimeType === 'application/javascript' ||
              mimeType === 'application/typescript' ||
              mimeType === 'application/xml'
            ) {
              const decoded = Buffer.from(data, 'base64').toString('utf-8')
              fileParts.push(`--- File: ${name} ---\n${decoded}\n--- End: ${name} ---`)
            } else if (mimeType === 'application/pdf') {
              const decoded = Buffer.from(data, 'base64').toString('utf-8')
              const cleaned = decoded.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n')
              fileParts.push(`--- PDF: ${name} ---\n${cleaned.slice(0, 50_000)}\n--- End: ${name} ---`)
            }
          }
        }

        message = textParts.join('').trim()
        if (fileParts.length > 0) {
          message = `${fileParts.join('\n\n')}\n\n${message}`
        }
        if (imageParts.length > 0) {
          multimodalContent = [
            ...imageParts,
            { type: 'text' as const, text: message },
          ]
        }
      }
    }

    if (!message) {
      console.warn(`[Chat][${requestId}] Empty message`)
      return c.json({ error: 'Message is required' }, 400)
    }

    const detectedSkill = extractSkillFromMessage(message)
    if (detectedSkill && !isSkillEnabled(detectedSkill)) {
      const reason = getSkillDisabledReason(detectedSkill) || 'This skill is currently disabled.'
      console.warn(`[Chat][${requestId}] Blocked disabled skill: ${detectedSkill}`)
      cognition.step('skill-check', `Skill blocked: ${detectedSkill}`, reason)
      cognition.done()
      return c.json({ error: 'Skill unavailable', reason }, 403)
    }
    if (detectedSkill) {
      cognition.step('skill-check', `Skill active: ${detectedSkill}`)
    }

    console.log(`[Chat][${requestId}] Message: "${message.substring(0, 50)}..." (${message.length} chars)`)

    const { conversationId, model, taskType, agentOverride, thinkHarder } = body ?? {} as any

    let conversation = conversationId
      ? await conversationStore.getConversation(conversationId, userId)
      : null

    if (conversationId && !conversation) {
      console.log(`[Chat][${requestId}] Conversation ${conversationId} not found, creating new`)
      conversation = null
    }

    if (!conversation) {
      const title = conversationStore.generateTitle(message)
      conversation = await conversationStore.createConversation(userId, { title, model })
      console.log(`[Chat][${requestId}] Created conversation: ${conversation.id}`)
    } else {
      console.log(`[Chat][${requestId}] Using existing conversation: ${conversation.id}`)
    }

    await conversationStore.addMessage(conversation.id, {
      conversationId: conversation.id,
      role: 'user',
      content: message,
    })

    const history = await conversationStore.getRecentContext(conversation.id)
    cognition.step('context-build', `Context assembled`, `${history.length} messages in history`)

    const agentInfo = detectAgent(message)
    console.log(`[Chat][${requestId}] Routed to agent: ${agentInfo.agent} (intent: ${agentInfo.intent})`)
    cognition.step(
      'agent-route',
      `Routed → ${toAgentLabel(agentInfo.agent)}`,
      `intent: ${agentInfo.intent}, confidence: ${Math.round(agentInfo.confidence * 100)}%`
    )

    const useGitHubModel = Boolean(githubToken) && model === 'github-deepseek'

    // ── PATH 1: Claude SDK Bridge (Opus via Max subscription, $0 cost) ──
    const useClaudeSDK = model === 'claude-local' || resolveModelKey(model) === 'claude-local'
    const shouldUseClaudeSDK = (thinkHarder || useClaudeSDK) && !useGitHubModel

    if (shouldUseClaudeSDK && await isBridgeAvailable()) {
      console.log(`[ClaudeSDK][${requestId}] Routing through Claude SDK bridge`)
      cognition.step('agent-route', 'Claude SDK Bridge', 'Opus via Max subscription ($0 API cost)')

      let researchContext = ''
      if (thinkHarder && isExaAvailable()) {
        cognition.step('tool-dispatch', 'Exa deep research', 'ThinkHarder — searching live sources')
        const results = await exaSearch(message, { numResults: 5 })
        researchContext = formatExaContext(results)
        if (researchContext) cognition.step('tool-dispatch', `Exa: ${results.length} sources found`)
      }

      const bridgeResult = bridgeChat({
        message,
        conversationId: conversation.id,
        history: history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        thinkHarder,
        researchContext: researchContext || undefined,
      })

      cognition.step('gateway-call', 'Streaming from Claude Opus', 'Local CLI bridge')

      let cancelled = false
      const stream = new ReadableStream({
        start(controller) {
          ;(async () => {
            let fullText = ''
            for await (const event of bridgeResult.stream) {
              if (cancelled) break
              if (event.type === 'text-delta' && event.delta) fullText += event.delta
              if (event.type === 'error') {
                cognition.step('error', 'Claude SDK error', event.delta ?? 'Unknown error')
              }
              controller.enqueue(event)
            }
            if (fullText) {
              await conversationStore.addMessage(conversation!.id, {
                conversationId: conversation!.id,
                role: 'assistant',
                content: fullText,
                model: 'claude-local',
              })
            }
            cognition.done()
            if (!cancelled) controller.close()
          })().catch((error) => {
            cognition.step('error', 'Stream error', error instanceof Error ? error.message : String(error))
            cognition.done()
            if (!cancelled) controller.error(error)
          })
        },
        cancel() { cancelled = true; bridgeResult.abort() },
      })

      c.header('X-Conversation-Id', conversation.id)
      c.header('X-PIC-Agent', 'claude-opus-local')

      return createUIMessageStreamResponse({
        stream,
        headers: {
          'X-Conversation-Id': conversation.id,
          'X-PIC-Agent': 'claude-opus-local',
          'Access-Control-Allow-Origin': c.req.header('Origin') || '*',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Expose-Headers': 'X-Conversation-Id, X-PIC-Agent',
        },
      })
    }

    // ── PATH 1B: 21st API deep thinking fallback ────────────────────────
    if (thinkHarder && !useGitHubModel && is21stAvailable()) {
      console.log(`[21stAPI][${requestId}] Claude SDK unavailable, falling back to 21st API`)
      cognition.step('agent-route', '21st API Deep Thinking', 'Claude SDK unavailable')

      try {
        let researchContext = ''
        if (isExaAvailable()) {
          const results = await exaSearch(message, { numResults: 3 })
          researchContext = formatExaContext(results)
        }

        const deepResult = await deepThink(
          { message, context: researchContext || undefined },
          userId,
        )

        cognition.step('response-ready', '21st API response', `${deepResult.content.length} chars`)

        await conversationStore.addMessage(conversation.id, {
          conversationId: conversation.id,
          role: 'assistant',
          content: deepResult.content,
          model: '21st-deep-think',
        })

        const uiMessageId = `assistant-${Date.now()}`
        const uiReasoningId = `reasoning-${Date.now()}`
        const content = deepResult.content

        let streamCancelled = false
        const stream = new ReadableStream({
          start(controller) {
            ;(async () => {
              controller.enqueue({ type: 'reasoning-start', id: uiReasoningId })
              controller.enqueue({
                type: 'reasoning-delta',
                id: uiReasoningId,
                delta: `Deep thinking via 21st API.\nProcessed in ${deepResult.durationMs}ms.\n`,
              })
              controller.enqueue({ type: 'reasoning-end', id: uiReasoningId })
              controller.enqueue({ type: 'text-start', id: uiMessageId })
              for (let i = 0; i < content.length; i += 72) {
                if (streamCancelled) return
                controller.enqueue({ type: 'text-delta', id: uiMessageId, delta: content.slice(i, i + 72) })
                await new Promise((resolve) => setTimeout(resolve, 18))
              }
              if (!streamCancelled) {
                controller.enqueue({ type: 'text-end', id: uiMessageId })
                cognition.done()
                controller.close()
              }
            })().catch((error) => {
              cognition.done()
              if (!streamCancelled) controller.error(error)
            })
          },
          cancel() { streamCancelled = true },
        })

        c.header('X-Conversation-Id', conversation.id)
        return createUIMessageStreamResponse({
          stream,
          headers: {
            'X-Conversation-Id': conversation.id,
            'X-PIC-Agent': '21st-deep-think',
            'Access-Control-Allow-Origin': c.req.header('Origin') || '*',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Expose-Headers': 'X-Conversation-Id, X-PIC-Agent',
          },
        })
      } catch (err) {
        console.warn(`[21stAPI][${requestId}] Deep think failed, falling through to OpenRouter:`, err)
        cognition.step('error', '21st API failed', err instanceof Error ? err.message : String(err))
      }
    }

    // ── PATH 2: OpenRouter (Claude Opus 4.6) — PRIMARY PATH ─────────────
    const preferredModel = useGitHubModel ? 'github-deepseek' : (model || 'openrouter-opus')
    console.log(`[Chat][${requestId}] Using OpenRouter API (preferred: ${preferredModel})`)

    let researchContext = ''
    if (thinkHarder && isExaAvailable()) {
      cognition.step('tool-dispatch', 'Exa deep research', 'ThinkHarder enabled')
      const results = await exaSearch(message, { numResults: 5 })
      researchContext = formatExaContext(results)
      if (researchContext) cognition.step('tool-dispatch', `Exa: ${results.length} sources found`)
    }

    const agentRole = (agentOverride as OpenClawAgentRole | undefined) ?? agentInfo.agent
    const skillTag = extractSkillTag(message)
    const systemPrompt = getAgentSystemPrompt(agentRole, { skillTag, thinkHarder })

    const selection = selectModel({
      preferredModel,
      taskType: agentInfo.intent || taskType || 'chat',
      messageCount: history.length,
      inputChars: message.length,
    })

    logModelSelection(selection, { preferredModel, taskType })
    console.log(`[Chat][${requestId}] Selected model: ${selection.model} (provider: ${selection.provider})`)
    cognition.step('gateway-call', `Calling ${selection.model}`, `provider: ${selection.provider}`)

    let aiModel
    try {
      aiModel = createModelClient(selection.model as AiModelKey)
    } catch (err) {
      console.error(`[Chat][${requestId}] Failed to create model client:`, err)
      if (useGitHubModel) {
        return c.json({ error: 'GPT-4o via GitHub Models is unavailable right now.', requestId }, 503)
      }
      const fallback = getFallbackModel(selection.model as AiModelKey)
      if (fallback) {
        markProviderUnhealthy(selection.provider)
        aiModel = createModelClient(fallback.model as AiModelKey)
      } else {
        throw err
      }
    }

    const augmentedMessage = researchContext ? `${researchContext}\n\n${message}` : message

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history,
      { role: 'user' as const, content: augmentedMessage },
    ]

    console.log(`[Chat][${requestId}] Calling streamText with ${messages.length} messages`)

    let chunksReceived = 0
    let lastChunkTime = Date.now()

    const result = streamText({
      model: aiModel,
      messages,
      temperature: 0.4,
      maxOutputTokens: 4096,
      abortSignal: AbortSignal.timeout(STREAM_TIMEOUT_MS),
      onChunk: ({ chunk }) => {
        chunksReceived++
        const now = Date.now()
        if (chunksReceived % 10 === 0 || now - lastChunkTime > 5000) {
          console.log(`[Chat][${requestId}] Chunk #${chunksReceived}, gap: ${now - lastChunkTime}ms`)
        }
        lastChunkTime = now
      },
      onFinish: async ({ text }) => {
        const duration = Date.now() - startTime
        console.log(`[Chat][${requestId}] Stream finished (${duration}ms, ${text.length} chars)`)
        cognition.step('response-ready', 'Response complete', `${text.length} chars in ${duration}ms`)
        cognition.done()
        try {
          await conversationStore.addMessage(conversation!.id, {
            conversationId: conversation!.id,
            role: 'assistant',
            content: text,
            model: selection.model,
          })
        } catch (saveErr) {
          console.error(`[Chat][${requestId}] Failed to save message:`, saveErr)
        }
      },
    })

    c.header('X-Conversation-Id', conversation.id)
    c.header('X-PIC-Agent', agentInfo.agent)

    return result.toUIMessageStreamResponse({
      headers: {
        'X-Conversation-Id': conversation.id,
        'X-Request-Id': requestId,
        'X-PIC-Agent': agentInfo.agent,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[Chat][${requestId}] Fatal error after ${duration}ms:`, error)
    cognition.step('error', 'Fatal error', error instanceof Error ? error.message : String(error))
    cognition.done()

    let errorMessage = 'Connected but error — try again in a moment.'
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.'
      } else if (error.message.includes('API key') || error.message.includes('authentication')) {
        errorMessage = 'Connected but error — check model configuration.'
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment.'
      } else if (error.message.includes('GitHub Models')) {
        errorMessage = 'GPT-4o is temporarily unavailable.'
      }
    }

    return c.json({ error: errorMessage, requestId, duration: `${duration}ms` }, 500)
  }
}

export async function handleChatStream(c: Context) {
  return handleChat(c)
}
