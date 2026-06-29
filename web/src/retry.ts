const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= maxRetries) break;
      const delay = Math.min(
        INITIAL_BACKOFF_MS * Math.pow(2, attempt) * (0.8 + Math.random() * 0.4),
        MAX_BACKOFF_MS,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
