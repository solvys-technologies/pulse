import type { Context } from 'hono';
import {
  getBoardroomMessages,
  getInterventionMessages,
  sendToIntervention,
  sendMentionToBoardroom,
  checkBoardroomStatus,
} from '../../services/clawdbot-sessions.js';

interface SendInterventionBody {
  message?: string;
}

interface SendMentionBody {
  message?: string;
  agent?: string;
}

/**
 * GET /api/boardroom/messages
 * Read boardroom coordination transcript.
 */
export async function handleGetBoardroomMessages(c: Context) {
  try {
    const messages = await getBoardroomMessages('pic-boardroom');
    return c.json({ messages });
  } catch (error) {
    console.error('[Boardroom] Failed to fetch boardroom messages:', error);
    return c.json({ error: 'Failed to fetch boardroom messages' }, 500);
  }
}

/**
 * GET /api/boardroom/intervention/messages
 * Read intervention transcript (User <-> Harper channel).
 */
export async function handleGetInterventionMessages(c: Context) {
  try {
    const messages = await getInterventionMessages('pic-intervention');
    return c.json({ messages });
  } catch (error) {
    console.error('[Boardroom] Failed to fetch intervention messages:', error);
    return c.json({ error: 'Failed to fetch intervention messages' }, 500);
  }
}

/**
 * POST /api/boardroom/intervention/send
 * Send a user command to Harper via intervention session.
 */
export async function handleSendInterventionMessage(c: Context) {
  try {
    const body = await c.req.json<SendInterventionBody>().catch(() => null);
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return c.json({ error: 'message is required' }, 400);
    }

    await sendToIntervention(message, 'pic-intervention');
    return c.json({ success: true });
  } catch (error) {
    console.error('[Boardroom] Failed to send intervention message:', error);
    return c.json({ error: 'Failed to send intervention message' }, 500);
  }
}

/**
 * POST /api/boardroom/mention/send
 * Send a @mention message directly to the boardroom thread targeting a specific agent.
 */
export async function handleSendMentionMessage(c: Context) {
  try {
    const body = await c.req.json<SendMentionBody>().catch(() => null);
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const agent = typeof body?.agent === 'string' ? body.agent.trim() : '';

    if (!message) {
      return c.json({ error: 'message is required' }, 400);
    }
    if (!agent) {
      return c.json({ error: 'agent is required' }, 400);
    }

    await sendMentionToBoardroom(message, agent);
    return c.json({ success: true });
  } catch (error) {
    console.error('[Boardroom] Failed to send mention message:', error);
    return c.json({ error: 'Failed to send mention message' }, 500);
  }
}

/**
 * GET /api/boardroom/status
 * Quick check that expected Clawdbot sessions are available.
 */
export async function handleGetBoardroomStatus(c: Context) {
  try {
    const status = await checkBoardroomStatus();
    return c.json(status);
  } catch (error) {
    console.error('[Boardroom] Failed to fetch boardroom status:', error);
    return c.json({ error: 'Failed to fetch boardroom status' }, 500);
  }
}
