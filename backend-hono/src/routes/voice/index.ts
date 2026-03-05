import { Hono } from 'hono';
import { handleSpeak, handleTranscribe } from './handlers.js';

export function createVoiceRoutes(): Hono {
  const router = new Hono();

  router.post('/transcribe', handleTranscribe);
  router.post('/speak', handleSpeak);

  return router;
}
