export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxAttempts = 3
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
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
