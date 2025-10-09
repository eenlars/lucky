/**
 * Singleton Models instance configured from core-config.
 * Provides a centralized instance of @lucky/models for the entire core package.
 */

import type { UserExecutionContext } from "@core/auth/types"
import { getCurrentProvider } from "@core/utils/spending/provider"
import { type Models, type ModelsConfig, type ProviderConfig, createModels } from "@lucky/models"
import { buildTierConfigFromDefaults } from "./tier-config-builder"

let modelsInstance: Models | null = null

/**
 * Build provider configuration from core config and environment.
 * When using OpenRouter, creates aliases for all providers to route through it.
 * This matches old behavior where all models route through CURRENT_PROVIDER.
 */
function buildProviderConfig(): Record<string, ProviderConfig> {
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true"
  const currentProvider = getCurrentProvider()

  const providers: Record<string, ProviderConfig> = {}

  // Get API key for current provider
  const envKey = process.env[`${currentProvider.toUpperCase()}_API_KEY`]
  const apiKey = envKey || (isTest ? "test-key" : undefined)

  if (!apiKey && !isTest) {
    throw new Error(`No API key found for provider: ${currentProvider}`)
  }

  // If using OpenRouter, configure it to handle ALL provider prefixes
  // OpenRouter supports models from all providers (openai/*, anthropic/*, etc.)
  if (currentProvider === "openrouter") {
    providers.openrouter = {
      id: "openrouter",
      apiKey: apiKey!,
      baseUrl: getBaseUrlForProvider("openrouter"),
      enabled: true,
    }
  } else {
    // For other providers, configure only that provider
    providers[currentProvider] = {
      id: currentProvider,
      apiKey: apiKey!,
      baseUrl: getBaseUrlForProvider(currentProvider),
      enabled: true,
    }
  }

  return providers
}

/**
 * Get or create the singleton Models instance.
 * Configured based on core-config settings.
 */
export function getModelsInstance(): Models {
  if (!modelsInstance) {
    const modelsConfig: ModelsConfig = {
      providers: buildProviderConfig(),
      tiers: buildTierConfigFromDefaults(),
      defaultTier: "default",
      trackPerformance: true,
      trackCost: true,
    }

    modelsInstance = createModels(modelsConfig)
  }

  return modelsInstance
}

/**
 * Reset the singleton instance (useful for testing or config changes).
 */
export function resetModelsInstance(): void {
  modelsInstance = null
}

/**
 * Get base URL for a given provider.
 */
function getBaseUrlForProvider(provider: string): string | undefined {
  switch (provider) {
    case "openrouter":
      return "https://openrouter.ai/api/v1"
    case "groq":
      return "https://api.groq.com/openai/v1"
    default:
      return undefined
  }
}

/**
 * Build provider configuration with user-scoped API keys.
 * When using OpenRouter, creates aliases for all providers to route through it.
 * Falls back to environment variables if user context not provided or user doesn't have keys.
 */
async function buildProviderConfigWithUserKeys(
  userContext?: UserExecutionContext,
): Promise<Record<string, ProviderConfig>> {
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true"
  const currentProvider = getCurrentProvider()
  const providers: Record<string, ProviderConfig> = {}

  let apiKey: string | undefined

  // Try user's API key first if user context provided
  if (userContext) {
    try {
      const userKey = await userContext.apiKeyResolver.getProviderApiKey(currentProvider)
      apiKey = userKey ?? undefined
    } catch (_error) {
      // If user key retrieval fails, fall back to env
      apiKey = undefined
    }
  }

  // Fallback to environment variable
  if (!apiKey) {
    const envKey = process.env[`${currentProvider.toUpperCase()}_API_KEY`]
    apiKey = envKey
  }

  // Test mode fallback
  if (!apiKey && isTest) {
    apiKey = "test-key"
  }

  // Only add provider if we have an API key
  if (apiKey) {
    providers[currentProvider] = {
      id: currentProvider,
      apiKey,
      baseUrl: getBaseUrlForProvider(currentProvider),
      enabled: true,
    }
  }

  return providers
}

/**
 * Create a Models instance with user-scoped API key resolution.
 * This is the recommended way to get models in production workflows with user context.
 *
 * @param userContext - Optional user execution context with API key resolver
 * @returns Models instance configured with user's API keys (or env fallback)
 *
 * @example
 * ```ts
 * // With user context (production)
 * const models = await getModelsInstanceForUser(userContext)
 * const model = await models.model('openai/gpt-4')
 *
 * // Without user context (dev/test)
 * const models = await getModelsInstanceForUser()
 * const model = await models.model('openai/gpt-4')
 * ```
 */
export async function getModelsInstanceForUser(userContext?: UserExecutionContext): Promise<Models> {
  const modelsConfig: ModelsConfig = {
    providers: await buildProviderConfigWithUserKeys(userContext),
    tiers: buildTierConfigFromDefaults(),
    defaultTier: "default",
    trackPerformance: true,
    trackCost: true,
  }

  return createModels(modelsConfig)
}
