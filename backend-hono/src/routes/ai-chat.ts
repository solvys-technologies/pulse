import { Hono } from 'hono'
import type { Context } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { createChatService } from '../services/chat-service'

interface AuthPayload {
  sub?: string
  user_id?: string
  userId?: string
}

const getUserId = (c: Context): string | null => {
  const payload = c.get('auth') as AuthPayload | undefined
  return payload?.sub ?? payload?.user_id ?? payload?.userId ?? null
}

const parseNumber = (value: string | null, fallback: number) => {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

const resolveErrorStatus = (error: unknown): number => {
  if (!error || typeof error !== 'object') return 500
  const status = (error as { status?: number }).status ?? (error as { statusCode?: number }).statusCode
  if (status) return status
  const message = 'message' in error ? String((error as { message?: string }).message) : ''
  if (message.toLowerCase().includes('rate limit')) return 429
  if (message.toLowerCase().includes('invalid chat request')) return 400
  return 500
}

export const createAiChatRoutes = () => {
  const router = new Hono()
  const chatService = createChatService()

  router.post('/chat', authMiddleware, async (c) => {
    const userId = getUserId(c)
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    let body: unknown
    try {
      body = await c.req.json()
    } catch (error) {
      return c.json({ error: 'Invalid JSON payload' }, 400)
    }

    try {
      const result = await chatService.handleChat(userId, body, c.req.header('accept'))
      if (result.type === 'stream') {
        return result.response
      }
      return c.json(result.body, 200, { 'X-Conversation-Id': result.body.conversationId })
    } catch (error) {
      const status = resolveErrorStatus(error)
      const message = error instanceof Error ? error.message : 'Chat request failed'
      return c.json({ error: message }, status)
    }
  })

  router.get('/conversations', authMiddleware, async (c) => {
    const userId = getUserId(c)
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    const limit = parseNumber(c.req.query('limit'), 50)
    const offset = parseNumber(c.req.query('offset'), 0)
    const conversations = await chatService.listConversations(userId, { limit, offset })
    return c.json({ conversations })
  })

  router.get('/conversations/:id', authMiddleware, async (c) => {
    const userId = getUserId(c)
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    const conversationId = c.req.param('id')
    const result = await chatService.getConversation(userId, conversationId)
    if (!result) {
      return c.json({ error: 'Conversation not found' }, 404)
    }
    return c.json(result)
  })

  return router
}

export default createAiChatRoutes
