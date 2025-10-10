/**
 * Client-safe model utilities for React components.
 * Uses API routes to access server-side model utilities.
 */
import type { AllowedModelName, LuckyProvider, ModelPricingV2 } from "@lucky/shared"

/**
 * Browser default provider (hardcoded since runtime config requires Node.js).
 * Server-side code should use getCurrentProvider() from @lucky/shared.
 */
const BROWSER_DEFAULT_PROVIDER: LuckyProvider = "openrouter"

// Cache for active model names to avoid repeated API calls
let cachedModels: AllowedModelName[] | null = null
let cachedProvider: LuckyProvider | null = null

/**
 * Get all active models from provider structure.
 * Defaults to openrouter for browser contexts.
 */
export const getActiveModelNames = <T extends LuckyProvider>(customProvider?: T): AllowedModelName[] => {
  const provider = customProvider ?? (BROWSER_DEFAULT_PROVIDER as T)

  // Return cached if available for same provider
  if (cachedModels && cachedProvider === provider) {
    return cachedModels as AllowedModelName[]
  }

  // Synchronous API - throw error if called before cache is populated
  throw new Error("getActiveModelNames must be called after useModelCache hook")
}

/**
 * Get model pricing for a given model name. Throws if the model is unknown.
 * Defaults to openrouter for browser contexts.
 */
export function getModelV2(_model: string, _customProvider?: LuckyProvider): ModelPricingV2 {
  throw new Error("getModelV2 should use API route directly - use useModelInfo hook instead")
}

/**
 * Hook to fetch and cache active model names.
 * Call this in components that need model lists.
 */
export async function fetchActiveModelNames(customProvider?: LuckyProvider): Promise<AllowedModelName[]> {
  const provider = customProvider ?? BROWSER_DEFAULT_PROVIDER

  const response = await fetch("/api/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getActiveModelNames", provider }),
  })

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch model names")
  }

  // Cache results
  cachedModels = result.models
  cachedProvider = provider

  return result.models
}

/**
 * Fetch model pricing information.
 */
export async function fetchModelV2(model: string, customProvider?: LuckyProvider): Promise<ModelPricingV2> {
  const provider = customProvider ?? BROWSER_DEFAULT_PROVIDER

  const response = await fetch("/api/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getModelV2", model, provider }),
  })

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch model info")
  }

  return result.model
}
