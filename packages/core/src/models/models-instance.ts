/**
 * Singleton Models instance configured from core-config.
 * Provides a centralized instance of @lucky/models for the entire core package.
 */

import { getApiKey } from "@core/context/executionContext"
import { getProviderDisplayName } from "@core/workflow/provider-extraction"
import { type Models, type ModelsConfig, type ProviderConfig, createModels } from "@lucky/models"
import { buildTierConfigFromDefaults } from "./tier-config-builder"

let _modelsInstance: Models | null = null

/**
 * Build provider configuration from core config and environment.
 * Configures ALL providers that have API keys available.
 * In test environments (when API keys are missing), provides mock API keys
 * to allow unit tests to run without real credentials.
 *
 * Checks execution context first for user-specific keys, falls back to process.env.
 */
async function buildProviderConfig(): Promise<Record<string, ProviderConfig>> {
  console.log("[buildProviderConfig] Starting to build provider config")
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true"

  const providers: Record<string, ProviderConfig> = {}
  const missingKeys: string[] = []

  // Configure all available providers (not just the current one)
  // This allows code to use any model from any provider (e.g., openai/gpt-4, openrouter/...)
  // Note: Lucky supports openai, openrouter, and groq as primary providers
  // Anthropic models are accessed via OpenRouter

  // OpenAI
  const openaiKey = (await getApiKey("OPENAI_API_KEY")) || (isTest ? "test-key" : undefined)
  if (openaiKey) {
    providers.openai = {
      id: "openai",
      apiKey: openaiKey,
      enabled: true,
    }
    console.log("✓ OpenAI provider configured")
  } else {
    missingKeys.push("OPENAI_API_KEY")
  }

  // OpenRouter
  const openrouterKey = (await getApiKey("OPENROUTER_API_KEY")) || (isTest ? "test-key" : undefined)
  if (openrouterKey) {
    providers.openrouter = {
      id: "openrouter",
      apiKey: openrouterKey,
      baseUrl: "https://openrouter.ai/api/v1",
      enabled: true,
    }
    console.log("✓ OpenRouter provider configured")
  } else {
    missingKeys.push("OPENROUTER_API_KEY")
  }

  // Groq
  const groqKey = (await getApiKey("GROQ_API_KEY")) || (isTest ? "test-key" : undefined)
  if (groqKey) {
    providers.groq = {
      id: "groq",
      apiKey: groqKey,
      baseUrl: "https://api.groq.com/openai/v1",
      enabled: true,
    }
    console.log("✓ Groq provider configured")
  } else {
    missingKeys.push("GROQ_API_KEY")
  }

  console.log(`[buildProviderConfig] Configured providers: [${Object.keys(providers).join(", ")}]`)
  if (missingKeys.length > 0) {
    const missingProviders = missingKeys.map(getProviderDisplayName)
    const { getExecutionContext } = await import("@core/context/executionContext")
    const ctx = getExecutionContext()
    if (ctx?.principal.auth_method === "session") {
      console.error(`❌ Missing required provider API keys: ${missingProviders.join(", ")}`)
      console.error("   → Configure them in Settings → Providers")
    } else {
      console.warn(`⚠️  Missing provider API keys: ${missingProviders.join(", ")}`)
      console.warn("   Add them in Settings → Providers or set them in your .env file")
    }
  }

  return providers
}

/**
 * Get or create the Models instance.
 * Configured based on core-config settings and execution context.
 *
 * IMPORTANT: Always creates a new instance to use per-request API keys.
 * The instance is lightweight and caches model metadata internally.
 */
export async function getModelsInstance(): Promise<Models> {
  const providers = await buildProviderConfig()

  const modelsConfig: ModelsConfig = {
    providers,
    tiers: buildTierConfigFromDefaults(),
    defaultTier: "default",
    trackPerformance: true,
    trackCost: true,
  }

  return createModels(modelsConfig)
}

/**
 * Reset the singleton instance (useful for testing or config changes).
 * @deprecated No longer uses singleton pattern - kept for backward compatibility
 */
export function resetModelsInstance(): void {
  _modelsInstance = null
}
