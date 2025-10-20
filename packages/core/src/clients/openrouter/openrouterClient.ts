import { getApiKey } from "@core/context/executionContext"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

/**
 * Get OpenRouter client with user-specific or server-level API key.
 * Checks execution context first (user's key), then falls back to process.env.
 */
export async function getOpenRouterClient(): Promise<ReturnType<typeof createOpenRouter>> {
  const apiKey = await getApiKey("OPENROUTER_API_KEY")

  if (!apiKey) {
    throw new Error(
      "No OpenRouter API key available. " +
        "Add OPENROUTER_API_KEY to your environment settings at /settings. " +
        "Get your API key at: https://openrouter.ai/keys",
    )
  }

  return createOpenRouter({ apiKey })
}

/**
 * Check if OpenRouter is available (checks context or process.env).
 */
export async function isOpenRouterAvailable(): Promise<boolean> {
  const apiKey = await getApiKey("OPENROUTER_API_KEY")
  return !!apiKey
}
