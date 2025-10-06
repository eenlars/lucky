import { envi } from "@core/utils/env.mjs"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

/**
 * Lazy-initialized OpenRouter client.
 * Will be undefined if API key is not configured.
 */
let openrouterClient: ReturnType<typeof createOpenRouter> | undefined

/**
 * Get OpenRouter client, initializing if necessary.
 * Returns undefined if OPENROUTER_API_KEY is not configured.
 */
function getOpenRouterClient(): ReturnType<typeof createOpenRouter> | undefined {
  if (openrouterClient) return openrouterClient

  const apiKey = envi.OPENROUTER_API_KEY

  if (!apiKey) {
    console.warn("OPENROUTER_API_KEY not configured. OpenRouter models will not be available.")
    return undefined
  }

  openrouterClient = createOpenRouter({ apiKey })
  return openrouterClient
}

/**
 * Check if OpenRouter is available.
 */
export function isOpenRouterAvailable(): boolean {
  return !!envi.OPENROUTER_API_KEY
}

/**
 * Export OpenRouter client using Proxy for lazy initialization.
 * Access to any property or function call will attempt to initialize the client.
 * Throws descriptive error if API key is not configured.
 */
export const openrouter = new Proxy((() => {}) as unknown as ReturnType<typeof createOpenRouter>, {
  get(_target, prop) {
    const client = getOpenRouterClient()

    if (!client) {
      throw new Error(
        "OpenRouter client not available. Set OPENROUTER_API_KEY in your environment. " +
          "Get your API key at: https://openrouter.ai/keys",
      )
    }

    const value = client[prop as keyof typeof client]

    if (typeof value === "function") {
      return value.bind(client)
    }

    return value
  },
  apply(_target, _thisArg, argArray) {
    const client = getOpenRouterClient()

    if (!client) {
      throw new Error(
        "OpenRouter client not available. Set OPENROUTER_API_KEY in your environment. " +
          "Get your API key at: https://openrouter.ai/keys",
      )
    }

    // @ts-expect-error - client is callable but TypeScript doesn't know
    return client(...argArray)
  },
}) as ReturnType<typeof createOpenRouter>
