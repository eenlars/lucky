/**
 * Model resolution with fallback logic.
 *
 * Resolves which models a user can actually use for a workflow by:
 * 1. Checking workflow's required models
 * 2. Filtering by user's enabled models
 * 3. Falling back to any enabled model if specific ones unavailable
 */

export type ResolvedModels = {
  /** Gateway names that have available models */
  gateways: Set<string>
  /** Gateway -> available model names (post-filtering/fallback) */
  models: Map<string, string[]>
  /** Gateways where fallback was used */
  fallbacksUsed: Map<
    string,
    {
      requested: string[]
      used: string[]
    }
  >
}

/**
 * Resolve available models by filtering required models against user's enabled models.
 *
 * Strategy per
 * 1. If workflow requires specific models AND user has them enabled → use those
 * 2. If workflow requires models but user doesn't have them → fallback to ANY enabled model
 * 3. If no enabled models for gateway → gateway is unavailable
 *
 * @param requiredModels - Models required by workflow (gateway -> model names)
 * @param enabledModels - Models enabled by user (gateway -> model names)
 * @returns Resolved models with fallback information
 *
 * @example
 * const required = new Map([["openai-api", ["gpt-4o", "gpt-4"]]])
 * const enabled = new Map([["openai-api", ["gpt-4o-mini", "gpt-3.5-turbo"]]])
 * const resolved = resolveAvailableModels(required, enabled)
 * // resolved.models = Map { "openai-api" => ["gpt-4o-mini"] } (fallback used)
 * // resolved.fallbacksUsed = Map { "openai-api" => { requested: ["gpt-4o", "gpt-4"], used: ["gpt-4o-mini"] } }
 */
export function resolveAvailableModels(
  requiredModels: Map<string, string[]>,
  enabledModels: Map<string, string[]>,
): ResolvedModels {
  const gateways = new Set<string>()
  const models = new Map<string, string[]>()
  const fallbacksUsed = new Map<
    string,
    {
      requested: string[]
      used: string[]
    }
  >()

  for (const [gateway, requestedModels] of requiredModels.entries()) {
    const userEnabledModels = enabledModels.get(gateway) || []

    // No enabled models for this gateway - skip it
    if (userEnabledModels.length === 0) {
      console.warn(`[model-resolver] Gateway ${gateway} has no enabled models for user`)
      continue
    }

    // Find intersection of requested and enabled models
    const availableModels = requestedModels.filter(model => userEnabledModels.includes(model))

    if (availableModels.length > 0) {
      // User has at least one of the requested models
      gateways.add(gateway)
      models.set(gateway, availableModels)
      console.log(`[model-resolver] Gateway ${gateway}: using ${availableModels.length} requested models`)
    } else {
      // User doesn't have any requested models - fall back to any enabled model
      gateways.add(gateway)
      models.set(gateway, userEnabledModels)
      fallbacksUsed.set(gateway, {
        requested: requestedModels,
        used: userEnabledModels,
      })
      console.log(
        `[model-resolver] Gateway ${gateway}: falling back to ${userEnabledModels.length} enabled models (requested models not available)`,
      )
    }
  }

  return {
    gateways,
    models,
    fallbacksUsed,
  }
}

/**
 * Get all gateways that have at least one enabled model.
 *
 * Use this when workflow has no specific model requirements (fallback mode).
 *
 * @param enabledModels - User's enabled models (gateway -> model names)
 * @returns Gateways and models available for use
 */
export function getAllAvailableModels(enabledModels: Map<string, string[]>): ResolvedModels {
  const gateways = new Set<string>()
  const models = new Map<string, string[]>()

  for (const [gateway, modelList] of enabledModels.entries()) {
    if (modelList.length > 0) {
      gateways.add(gateway)
      models.set(gateway, modelList)
    }
  }

  return {
    gateways,
    models,
    fallbacksUsed: new Map(),
  }
}
