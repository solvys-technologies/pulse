/**
 * AI Routes
 * Route registration for /api/ai endpoints
 * Day 19 - Phase 5 Implementation
 */

import { Hono } from 'hono'
import { handleChat, handleChatStream } from './handlers/chat.js'
import {
  handleListConversations,
  handleGetConversation,
  handleCreateConversation,
  handleUpdateConversation,
  handleDeleteConversation,
  handleArchiveConversation,
  handleUnarchiveConversation,
} from './handlers/conversations.js'

export function createAiRoutes(): Hono {
  const router = new Hono()

  // Chat endpoints
  // POST /api/ai/chat - Send message and get response
  router.post('/chat', handleChat)

  // POST /api/ai/chat/stream - Stream response (SSE)
  router.post('/chat/stream', handleChatStream)

  // Conversation endpoints
  // GET /api/ai/conversations - List conversations
  router.get('/conversations', handleListConversations)

  // POST /api/ai/conversations - Create new conversation
  router.post('/conversations', handleCreateConversation)

  // GET /api/ai/conversations/:id - Get conversation with messages
  router.get('/conversations/:id', handleGetConversation)

  // PATCH /api/ai/conversations/:id - Update conversation
  router.patch('/conversations/:id', handleUpdateConversation)

  // DELETE /api/ai/conversations/:id - Delete conversation
  router.delete('/conversations/:id', handleDeleteConversation)

  // POST /api/ai/conversations/:id/archive - Archive conversation
  router.post('/conversations/:id/archive', handleArchiveConversation)

  // POST /api/ai/conversations/:id/unarchive - Unarchive conversation
  router.post('/conversations/:id/unarchive', handleUnarchiveConversation)

  return router
}
