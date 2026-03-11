// [claude-code 2026-03-11] Market-data route factory — added /iv-score
import { Hono } from 'hono';
import { handleQuote, handleVix, handleGex, handleWalls, handleFlow, handleContext, handleIVScore } from './handlers.js';

export function createMarketDataRoutes(): Hono {
  const router = new Hono();
  router.get('/quote/:symbol', handleQuote);
  router.get('/vix', handleVix);
  router.get('/iv-score', handleIVScore); // blended 60/40 VIX+headlines
  router.get('/gex/:symbol', handleGex);
  router.get('/walls/:symbol', handleWalls);
  router.get('/flow/:symbol', handleFlow);
  router.get('/context/:symbol', handleContext); // full aggregated context
  return router;
}
