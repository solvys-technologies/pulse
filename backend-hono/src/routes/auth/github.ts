// [claude-code 2026-03-06] GitHub OAuth routes for GitHub Models integration (Kimi K2)
import { Hono } from 'hono'

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'

/**
 * GET /api/auth/github
 * Redirect user to GitHub OAuth consent screen
 */
function handleGitHubLogin(c: any) {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    return c.json({ error: 'GitHub OAuth not configured' }, 500)
  }

  const redirectUri = process.env.GITHUB_REDIRECT_URI ?? `${c.req.header('origin') ?? 'http://localhost:5173'}/auth/github/callback`
  const state = crypto.randomUUID()

  // Store state in cookie for CSRF protection
  c.header('Set-Cookie', `github_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: '',
    state,
  })

  return c.redirect(`${GITHUB_AUTHORIZE_URL}?${params.toString()}`)
}

/**
 * POST /api/auth/github/callback
 * Exchange authorization code for access token
 * Called by the frontend after GitHub redirects back
 */
async function handleGitHubCallback(c: any) {
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return c.json({ error: 'GitHub OAuth not configured' }, 500)
  }

  const { code, state } = (await c.req.json()) as { code: string; state: string }

  if (!code) {
    return c.json({ error: 'Missing authorization code' }, 400)
  }

  // Exchange code for access token
  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  })

  const tokenData = await tokenRes.json() as {
    access_token?: string
    token_type?: string
    scope?: string
    error?: string
    error_description?: string
  }

  if (tokenData.error || !tokenData.access_token) {
    console.error('[GitHub OAuth] Token exchange failed:', tokenData.error, tokenData.error_description)
    return c.json({ error: tokenData.error_description ?? 'Token exchange failed' }, 400)
  }

  // Fetch GitHub user profile
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/json',
    },
  })

  const user = await userRes.json() as {
    id: number
    login: string
    name: string | null
    avatar_url: string
  }

  console.log(`[GitHub OAuth] Authenticated: ${user.login} (${user.id})`)

  return c.json({
    token: tokenData.access_token,
    user: {
      id: user.id,
      login: user.login,
      name: user.name,
      avatar: user.avatar_url,
    },
  })
}

/**
 * POST /api/auth/github/validate
 * Validate that a stored GitHub token is still valid
 */
async function handleValidateToken(c: any) {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return c.json({ valid: false }, 401)
  }

  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    return c.json({ valid: false }, 401)
  }

  const user = await res.json() as { login: string }
  return c.json({ valid: true, login: user.login })
}

export function createGitHubAuthRoutes(): Hono {
  const router = new Hono()
  router.get('/', handleGitHubLogin)
  router.post('/callback', handleGitHubCallback)
  router.post('/validate', handleValidateToken)
  return router
}
