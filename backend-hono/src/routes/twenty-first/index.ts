// [claude-code 2026-03-10] 21st API token proxy — rate-limited session token exchange
/**
 * 21st API Routes
 * Token proxy endpoint for 21st API deep thinking fallback.
 * Rate-limited: 1 req/min/user.
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSessionToken, is21stAvailable, checkRateLimit } from '../../services/twenty-first/deep-think.js'

export function createTwentyFirstRoutes(): Hono {
  const router = new Hono()

  /**
   * POST /api/21st/token
   * Exchange server-side API key for a short-lived session token.
   * Keeps the API key off the client.
   */
  router.post('/token', async (c: Context) => {
    const userId = c.get('userId') as string | undefined

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    if (!is21stAvailable()) {
      return c.json({ error: '21st API not configured' }, 503)
    }

    // Rate limit check
    const { allowed, retryAfterMs } = checkRateLimit(userId)
    if (!allowed) {
      c.header('Retry-After', String(Math.ceil(retryAfterMs / 1000)))
      return c.json({
        error: 'Rate limited',
        retryAfterMs,
      }, 429)
    }

    try {
      const token = await getSessionToken()
      return c.json(token)
    } catch (err) {
      console.error('[21stAPI] Token exchange failed:', err)
      return c.json({
        error: 'Token exchange failed',
      }, 502)
    }
  })

  /**
   * GET /api/21st/status
   * Check 21st API availability.
   */
  router.get('/status', (c) => {
    return c.json({
      available: is21stAvailable(),
    })
  })

  return router
}
