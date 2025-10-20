/**
 * Client-safe model utilities for React components.
 * Uses API routes to access server-side model utilities.
 */
import type { LuckyGateway, ModelPricing } from "@lucky/shared"

/**
 * Browser default provider (hardcoded since runtime config requires Node.js).
 * Server-side code should use getCurrentGateway() from @lucky/shared.
 * MUST match the provider configured in apps/examples/settings/models.ts
 */
const BROWSER_DEFAULT_PROVIDER: LuckyGateway = "openrouter-api"

// Cache for active model names to avoid repeated API calls
let cachedModels: string[] | null = null
let cachedProvider: LuckyGateway | null = null

// Cache for model pricing to avoid repeated API calls
const modelPricingCache = new Map<string, ModelPricing>()

/**
 * Get all active models from provider structure.
 * Defaults to openrouter for browser contexts.
 */
export const getActiveGatewayModelIds = <T extends LuckyGateway>(customProvider?: T): string[] => {
  const provider = customProvider ?? (BROWSER_DEFAULT_PROVIDER as T)

  // Return cached if available for same provider
  if (cachedModels && cachedProvider === provider) {
    return cachedModels as string[]
  }

  // Synchronous API - throw error if called before cache is populated
  throw new Error("getActiveGatewayModelIds must be called after useModelCache hook")
}

/**
 * Get model pricing for a given model name from cache.
 * Returns null if not cached yet.
 * Use fetchModelV2 to populate the cache.
 */
export function getModelV2(gatewayModelId: string): ModelPricing | null {
  return modelPricingCache.get(gatewayModelId) ?? null
}

/**
 * Hook to fetch and cache active model names.
 * Call this in components that need model lists.
 */
export async function fetchActiveGatewayModelIds(customProvider?: LuckyGateway): Promise<string[]> {
  const provider = customProvider ?? BROWSER_DEFAULT_PROVIDER

  const response = await fetch("/api/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getActivegatewayModelIds", gateway: provider }),
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
 * Fetch model pricing information and cache it.
 */
export async function fetchModelV2(gatewayModelId: string, customProvider?: LuckyGateway): Promise<ModelPricing> {
  const provider = customProvider ?? BROWSER_DEFAULT_PROVIDER

  const response = await fetch("/api/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getModelV2", gatewayModelId, gateway: provider }),
  })

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch model info")
  }

  // Cache the result
  modelPricingCache.set(gatewayModelId, result.gatewayModelId)

  return result.gatewayModelId
}
