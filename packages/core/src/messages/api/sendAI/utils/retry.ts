/**
 * Generic async retry helper with linear backoff.
 *
 * Attempts to run `fn` up to `attempts` times. Between attempts, waits
 * `backoffMs * attempt` milliseconds. If `shouldRetry` returns true for the
 * resolved value, it retries (until attempts are exhausted). Errors are retried
 * as well, unless attempts are exhausted, in which case the last error is thrown.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  {
    attempts,
    backoffMs = 300,
    shouldRetry,
    onAttempt,
  }: {
    attempts: number
    backoffMs?: number
    shouldRetry?: (value: T) => boolean
    onAttempt?: (info: { attempt: number; attempts: number; value?: T; error?: unknown }) => void
  },
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= Math.max(1, attempts); attempt++) {
    try {
      const value = await fn()
      onAttempt?.({ attempt, attempts, value })
      if (shouldRetry && shouldRetry(value) && attempt < attempts) {
        await new Promise(r => setTimeout(r, backoffMs * attempt))
        continue
      }
      return value
    } catch (error) {
      lastError = error
      onAttempt?.({ attempt, attempts, error })
      if (attempt < attempts) {
        await new Promise(r => setTimeout(r, backoffMs * attempt))
        continue
      }
      throw error
    }
  }
  // Should never reach here, but TypeScript wants a return.
  // If it does, rethrow the last error.
  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? "retryWithBackoff: unknown error"))
}
