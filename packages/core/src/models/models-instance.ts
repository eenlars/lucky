/**
 * Singleton Models instance configured from core-config.
 * Provides a centralized instance of @lucky/models for the entire core package.
 */

import type { UserExecutionContext } from "@core/auth/types"
import { type Models, type ModelsConfig, type ProviderConfig, createModels } from "@lucky/models"
import { buildTierConfigFromDefaults } from "./tier-config-builder"

let modelsInstance: Models | null = null

/**
 * Build provider configuration from core config and environment.
 * Configures ALL providers that have API keys available.
 * In test environments (when API keys are missing), provides mock API keys
 * to allow unit tests to run without real credentials.
 */
function buildProviderConfig(): Record<string, ProviderConfig> {
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true"

  const providers: Record<string, ProviderConfig> = {}

  // Configure all available providers (not just the current one)
  // This allows code to use any model from any provider (e.g., openai/gpt-4, openrouter/...)
  // Note: Lucky supports openai, openrouter, and groq as primary providers
  // Anthropic models are accessed via OpenRouter

  // OpenAI
  const openaiKey = process.env.OPENAI_API_KEY || (isTest ? "test-key" : undefined)
  if (openaiKey) {
    providers.openai = {
      id: "openai",
      apiKey: openaiKey,
      enabled: true,
    }
  }

  // OpenRouter
  const openrouterKey = process.env.OPENROUTER_API_KEY || (isTest ? "test-key" : undefined)
  if (openrouterKey) {
    providers.openrouter = {
      id: "openrouter",
      apiKey: openrouterKey,
      baseUrl: "https://openrouter.ai/api/v1",
      enabled: true,
    }
  }

  // Groq
  const groqKey = process.env.GROQ_API_KEY || (isTest ? "test-key" : undefined)
  if (groqKey) {
    providers.groq = {
      id: "groq",
      apiKey: groqKey,
      baseUrl: "https://api.groq.com/openai/v1",
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
 * Falls back to environment variables if user context not provided or user doesn't have keys.
 */
async function buildProviderConfigWithUserKeys(
  userContext?: UserExecutionContext,
): Promise<Record<string, ProviderConfig>> {
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true"
  const providers: Record<string, ProviderConfig> = {}

  const providerNames = ["openai", "openrouter", "groq"] as const

  for (const providerName of providerNames) {
    let apiKey: string | undefined

    // Try user's API key first if user context provided
    if (userContext) {
      try {
        const userKey = await userContext.apiKeyResolver.getProviderApiKey(providerName)
        apiKey = userKey ?? undefined
      } catch (_error) {
        // If user key retrieval fails, fall back to env
        apiKey = undefined
      }
    }

    // Fallback to environment variable
    if (!apiKey) {
      const envKey = process.env[`${providerName.toUpperCase()}_API_KEY`]
      apiKey = envKey
    }

    // Test mode fallback
    if (!apiKey && isTest) {
      apiKey = "test-key"
    }

    // Only add provider if we have an API key
    if (apiKey) {
      providers[providerName] = {
        id: providerName,
        apiKey,
        baseUrl: getBaseUrlForProvider(providerName),
        enabled: true,
      }
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
