/**
 * AI Routes
 * Main route registration for AI endpoints
 */

import { Hono } from 'hono';
import * as conversationHandlers from './handlers/conversations.js';
import * as chatHandlers from './handlers/chat.js';
import * as threatHandlers from './handlers/threat.js';
import * as blindSpotHandlers from './handlers/blind-spots.js';

const aiRoutes = new Hono();

// Conversation Endpoints
aiRoutes.get('/conversations', conversationHandlers.handleListConversations);
aiRoutes.get('/conversations/:id', conversationHandlers.handleGetConversation);
aiRoutes.post('/conversations', conversationHandlers.handleCreateConversation);
aiRoutes.delete('/conversations/:id', conversationHandlers.handleDeleteConversation);

// Chat Endpoint (main streaming endpoint)
aiRoutes.post('/chat', chatHandlers.handleChat);

// Threat History Endpoints
aiRoutes.get('/threat-history', threatHandlers.handleGetThreatHistory);
aiRoutes.post('/threat-history/analyze', threatHandlers.handleAnalyzeThreats);

// Blind Spots Endpoints
aiRoutes.get('/blind-spots', blindSpotHandlers.handleGetBlindSpots);
aiRoutes.post('/blind-spots', blindSpotHandlers.handleUpsertBlindSpot);
aiRoutes.delete('/blind-spots/:id', blindSpotHandlers.handleDeleteBlindSpot);

// POST /ai/ntn-report - Generate NTN (Non-Trading News) report
aiRoutes.post('/ntn-report', async (c) => {
  const userId = c.get('userId');

  try {
    return c.json({
      report: {
        content: 'NTN Report: Market analysis and insights would be generated here.',
        generatedAt: new Date().toISOString(),
        userId,
      }
    });
  } catch (error) {
    console.error('Failed to generate NTN report:', error);
    return c.json({ error: 'Failed to generate NTN report' }, 500);
  }
});

// Legacy endpoints - simplified stubs
aiRoutes.get('/user-settings', async (c) => {
  return c.json({
    usualTradesPerDuration: 10,
    durationWindow: '24h',
    selectedInstrument: null,
  });
});

aiRoutes.get('/get-conversation', async (c) => {
  return c.json({ error: 'Use /ai/conversations/:id instead' }, 400);
});

aiRoutes.post('/check-tape', async (c) => {
  return c.json({
    message: 'Tape check feature is temporarily unavailable.',
    insights: [],
  });
});

aiRoutes.post('/generate-daily-recap', async (c) => {
  return c.json({
    message: 'Daily recap feature is temporarily unavailable.',
    recap: '',
  });
});

export { aiRoutes };
