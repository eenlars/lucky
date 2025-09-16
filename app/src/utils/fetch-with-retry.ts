export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxAttempts = 3
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // If the request was already aborted, do not attempt fetch
      if (options?.signal?.aborted) {
        const abortError = new Error("The operation was aborted")
        abortError.name = "AbortError"
        throw abortError
      }

      const response = await fetch(url, options)
      if (response.ok) {
        return response
      }

      // For non-network errors (4xx, 5xx), don't retry except for 503 Service Unavailable
      if (response.status !== 503) {
        return response
      }

      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      // AbortError should not be retried; surface immediately
      const isAbortError =
        (typeof error === "object" &&
          error !== null &&
          "name" in error &&
          (error as any).name === "AbortError") ||
        options?.signal?.aborted
      if (isAbortError) {
        throw error instanceof Error
          ? error
          : new Error("The operation was aborted")
      }
      lastError = error instanceof Error ? error : new Error("Network error")
    }

    // Wait before retrying (except on last attempt)
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, 100 * Math.pow(2, attempt))
      )
    }
  }

  throw lastError || new Error("Failed to fetch after retries")
}
