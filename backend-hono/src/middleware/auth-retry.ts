import type { Context, Next } from 'hono';

const BACKOFF_MS = [1000, 2000, 4000];

type RetryDecision = (error: unknown) => boolean;

const defaultShouldRetry: RetryDecision = (error) => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const message = 'message' in error ? String(error.message) : '';
  const name = 'name' in error ? String(error.name) : '';
  const combined = `${name} ${message}`.toLowerCase();
  return (
    combined.includes('jwks') ||
    combined.includes('fetch') ||
    combined.includes('network') ||
    combined.includes('timeout') ||
    combined.includes('econn') ||
    combined.includes('connection')
  );
};

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export type AuthRetryOptions = {
  shouldRetry?: RetryDecision;
  label?: string;
};

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: AuthRetryOptions = {},
): Promise<T> {
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;
  let lastError: unknown;

  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= BACKOFF_MS.length || !shouldRetry(error)) {
        break;
      }
      const delay = BACKOFF_MS[attempt] ?? 0;
      console.warn(
        `[auth-retry] ${options.label ?? 'auth'} retry ${attempt + 1} in ${delay}ms`,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

export function authRetry(
  verify: () => Promise<void>,
  options: AuthRetryOptions = {},
) {
  return async (_: Context, next: Next) => {
    await retryWithBackoff(verify, options);
    await next();
  };
}
