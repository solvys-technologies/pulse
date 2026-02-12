import { Hono } from 'hono';
import {
  handleGetBoardroomMessages,
  handleGetInterventionMessages,
  handleSendInterventionMessage,
  handleSendMentionMessage,
  handleGetBoardroomStatus,
} from './handlers.js';

export function createBoardroomRoutes(): Hono {
  const router = new Hono();

  router.get('/messages', handleGetBoardroomMessages);
  router.get('/intervention/messages', handleGetInterventionMessages);
  router.post('/intervention/send', handleSendInterventionMessage);
  router.post('/mention/send', handleSendMentionMessage);
  router.get('/status', handleGetBoardroomStatus);

  return router;
}
