import type { Context, Next } from 'hono';
import { createRemoteJWKSet, importSPKI, jwtVerify } from 'jose';
import { retryWithBackoff } from './auth-retry';

class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConfigError';
  }
}

let secretChecked = false;

const warnMissingSecret = () => {
  if (secretChecked) {
    return;
  }
  secretChecked = true;
  if (!process.env.CLERK_SECRET_KEY) {
    console.error('[auth] CLERK_SECRET_KEY is missing');
  } else if (!process.env.CLERK_SECRET_KEY.startsWith('sk_')) {
    console.warn('[auth] CLERK_SECRET_KEY does not look like a Clerk secret key');
  }
};

const getBearerToken = (c: Context) => {
  const authHeader = c.req.header('authorization') || '';
  const [type, token] = authHeader.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }
  return token.trim();
};

const getVerifier = async () => {
  const jwksUrl = process.env.CLERK_JWKS_URL;
  const jwtKey = process.env.CLERK_JWT_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (jwksUrl) {
    return createRemoteJWKSet(new URL(jwksUrl));
  }

  if (jwtKey) {
    return importSPKI(jwtKey, 'RS256');
  }

  if (secretKey) {
    warnMissingSecret();
    return new TextEncoder().encode(secretKey);
  }

  throw new AuthConfigError(
    'Missing Clerk JWT verification key. Set CLERK_JWKS_URL or CLERK_JWT_KEY.',
  );
};

const shouldRetryAuthError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const name = 'name' in error ? String(error.name) : '';
  const message = 'message' in error ? String(error.message) : '';
  const combined = `${name} ${message}`.toLowerCase();
  return (
    combined.includes('jwks') ||
    combined.includes('fetch') ||
    combined.includes('network') ||
    combined.includes('timeout')
  );
};

export const authMiddleware = async (c: Context, next: Next) => {
  warnMissingSecret();
  const token = getBearerToken(c);
  if (!token) {
    return c.json({ error: 'Missing Authorization bearer token' }, 401);
  }

  const issuer = process.env.CLERK_JWT_ISSUER;
  const audience = process.env.CLERK_JWT_AUDIENCE;

  try {
    const key = await getVerifier();
    const { payload } = await retryWithBackoff(
      async () =>
        jwtVerify(token, key, {
          issuer: issuer || undefined,
          audience: audience || undefined,
          clockTolerance: 5,
        }),
      { label: 'clerk-jwt', shouldRetry: shouldRetryAuthError },
    );

    c.set('auth', payload);
    return await next();
  } catch (error) {
    const name = error instanceof Error ? error.name : 'UnknownError';
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[auth] JWT verification failed: ${name}: ${message}`);

    if (error instanceof AuthConfigError) {
      return c.json({ error: 'Auth configuration error' }, 500);
    }

    if (shouldRetryAuthError(error)) {
      return c.json({ error: 'Auth verification temporarily unavailable' }, 503);
    }

    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};
