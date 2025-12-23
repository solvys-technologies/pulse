import log from "encore.dev/log";

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: (error) => {
    // Retry on network errors, rate limits, and 5xx errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("rate limit") ||
        message.includes("network") ||
        message.includes("timeout") ||
        message.includes("econnrefused") ||
        message.includes("enotfound")
      );
    }
    return false;
  },
};

/**
 * Retries an async function with exponential backoff
 * @param fn The async function to retry
 * @param options Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries are exhausted
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!opts.retryableErrors(error)) {
        log.warn("Non-retryable error encountered", {
          error: error instanceof Error ? error.message : String(error),
          attempt: attempt + 1,
        });
        throw error;
      }

      // Don't retry if we've exhausted all attempts
      if (attempt >= opts.maxRetries) {
        break;
      }

      // Log retry attempt
      log.info("Retrying after error", {
        error: error instanceof Error ? error.message : String(error),
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
        delayMs: delay,
      });

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  // All retries exhausted, throw the last error
  log.error("All retry attempts exhausted", {
    error: lastError instanceof Error ? lastError.message : String(lastError),
    maxRetries: opts.maxRetries,
  });
  throw lastError;
}
