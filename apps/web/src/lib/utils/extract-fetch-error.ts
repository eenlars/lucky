/**
 * Extract detailed error information from a fetch Response
 *
 * Attempts to:
 * 1. Extract error message from JSON response body
 * 2. Fall back to status text if body isn't JSON
 * 3. Fall back to HTTP status code if status text is unavailable
 *
 * @param response - The fetch Response object
 * @returns A descriptive error message
 */
export async function extractFetchError(response: Response): Promise<string> {
  const errorDetails = `HTTP ${response.status}`

  try {
    const errorData = await response.json()
    if (errorData.error) {
      return errorData.error
    }
    if (errorData.message) {
      return errorData.message
    }
    // If JSON exists but has no error/message, fall back to status text
  } catch {
    // If response body isn't JSON, continue to fall back
  }

  // Fall back to status text or HTTP status code
  return response.statusText || errorDetails
}
