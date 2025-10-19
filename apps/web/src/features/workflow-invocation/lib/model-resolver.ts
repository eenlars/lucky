/**
 * Model resolution with fallback logic.
 *
 * Resolves which models a user can actually use for a workflow by:
 * 1. Checking workflow's required models
 * 2. Filtering by user's enabled models
 * 3. Falling back to any enabled model if specific ones unavailable
 */

export type ResolvedModels = {
  /** Provider names that have available models */
  providers: Set<string>
  /** Provider -> available model names (post-filtering/fallback) */
  models: Map<string, string[]>
  /** Providers where fallback was used */
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
 * Strategy per provider:
 * 1. If workflow requires specific models AND user has them enabled → use those
 * 2. If workflow requires models but user doesn't have them → fallback to ANY enabled model
 * 3. If no enabled models for provider → provider is unavailable
 *
 * @param requiredModels - Models required by workflow (provider -> model names)
 * @param enabledModels - Models enabled by user (provider -> model names)
 * @returns Resolved models with fallback information
 *
 * @example
 * const required = new Map([["openai", ["gpt-4o", "gpt-4"]]])
 * const enabled = new Map([["openai", ["gpt-4o-mini", "gpt-3.5-turbo"]]])
 * const resolved = resolveAvailableModels(required, enabled)
 * // resolved.models = Map { "openai" => ["gpt-4o-mini"] } (fallback used)
 * // resolved.fallbacksUsed = Map { "openai" => { requested: ["gpt-4o", "gpt-4"], used: ["gpt-4o-mini"] } }
 */
export function resolveAvailableModels(
  requiredModels: Map<string, string[]>,
  enabledModels: Map<string, string[]>,
): ResolvedModels {
  const providers = new Set<string>()
  const models = new Map<string, string[]>()
  const fallbacksUsed = new Map<
    string,
    {
      requested: string[]
      used: string[]
    }
  >()

  for (const [provider, requestedModels] of requiredModels.entries()) {
    const userEnabledModels = enabledModels.get(provider) || []

    // No enabled models for this provider - skip it
    if (userEnabledModels.length === 0) {
      console.warn(`[model-resolver] Provider ${provider} has no enabled models for user`)
      continue
    }

    // Find intersection of requested and enabled models
    const availableModels = requestedModels.filter(model => userEnabledModels.includes(model))

    if (availableModels.length > 0) {
      // User has at least one of the requested models
      providers.add(provider)
      models.set(provider, availableModels)
      console.log(`[model-resolver] Provider ${provider}: using ${availableModels.length} requested models`)
    } else {
      // User doesn't have any requested models - fall back to any enabled model
      providers.add(provider)
      models.set(provider, userEnabledModels)
      fallbacksUsed.set(provider, {
        requested: requestedModels,
        used: userEnabledModels,
      })
      console.log(
        `[model-resolver] Provider ${provider}: falling back to ${userEnabledModels.length} enabled models (requested models not available)`,
      )
    }
  }

  return {
    providers,
    models,
    fallbacksUsed,
  }
}

/**
 * Get all providers that have at least one enabled model.
 *
 * Use this when workflow has no specific model requirements (fallback mode).
 *
 * @param enabledModels - User's enabled models (provider -> model names)
 * @returns Providers and models available for use
 */
export function getAllAvailableModels(enabledModels: Map<string, string[]>): ResolvedModels {
  const providers = new Set<string>()
  const models = new Map<string, string[]>()

  for (const [provider, modelList] of enabledModels.entries()) {
    if (modelList.length > 0) {
      providers.add(provider)
      models.set(provider, modelList)
    }
  }

  return {
    providers,
    models,
    fallbacksUsed: new Map(),
  }
}
