/**
 * Singleton Models instance configured from core-config.
 * Provides a centralized instance of @lucky/models for the entire core package.
 */

import { getApiKey, getExecutionContext } from "@core/context/executionContext"
import { getProviderDisplayName } from "@core/workflow/provider-extraction"
import { type Models, type ModelsConfig, type ProviderConfigOutput, createModels } from "@lucky/models"
import { PROVIDER_AVAILABILITY } from "@lucky/shared/contracts/config"
import { buildTierConfigFromDefaults } from "./tier-config-builder"

/**
 * Build provider configuration from core config and environment.
 * Only configures ENABLED providers that have API keys available.
 * In test environments (when API keys are missing), provides mock API keys
 * to allow unit tests to run without real credentials.
 *
 * Checks execution context first for user-specific keys, falls back to process.env.
 * Caches the result in RuntimeContext to avoid rebuilding multiple times per workflow.
 */
async function buildProviderConfig(): Promise<Record<string, ProviderConfigOutput>> {
  const ctx = getExecutionContext()

  // Check runtime cache first
  if (ctx?.has("providerConfig")) {
    console.log("[buildProviderConfig] Using cached provider config from runtime context")
    return ctx.get("providerConfig") as Record<string, ProviderConfigOutput>
  }

  console.log("[buildProviderConfig] Building provider config (first time this workflow)")
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true"

  const providers: Record<string, ProviderConfigOutput> = {}
  const missingKeys: string[] = []

  // Configure all ENABLED providers (respects PROVIDER_AVAILABILITY flags)
  // This allows code to use any model from any enabled provider (e.g., openai/gpt-4)

  // OpenAI
  if (PROVIDER_AVAILABILITY.openai) {
    const openaiKey = (await getApiKey("OPENAI_API_KEY")) || (isTest ? "test-key" : undefined)
    if (openaiKey) {
      providers.openai = {
        id: "openai" as const,
        apiKey: openaiKey,
        enabled: true,
      }
    } else {
      missingKeys.push("OPENAI_API_KEY")
    }
  }

  // OpenRouter (currently disabled)
  if (PROVIDER_AVAILABILITY.openrouter) {
    const openrouterKey = (await getApiKey("OPENROUTER_API_KEY")) || (isTest ? "test-key" : undefined)
    if (openrouterKey) {
      providers.openrouter = {
        id: "openrouter" as const,
        apiKey: openrouterKey,
        baseUrl: "https://openrouter.ai/api/v1",
        enabled: false,
      }
      console.log("✓ OpenRouter provider configured")
    } else {
      missingKeys.push("OPENROUTER_API_KEY")
    }
  }

  // Groq (currently disabled)
  if (PROVIDER_AVAILABILITY.groq) {
    const groqKey = (await getApiKey("GROQ_API_KEY")) || (isTest ? "test-key" : undefined)
    if (groqKey) {
      providers.groq = {
        id: "groq" as const,
        apiKey: groqKey,
        baseUrl: "https://api.groq.com/openai/v1",
        enabled: false,
      }
      console.log("✓ Groq provider configured")
    } else {
      missingKeys.push("GROQ_API_KEY")
    }
  }

  console.log(`[buildProviderConfig] Configured providers: [${Object.keys(providers).join(", ")}]`)
  if (missingKeys.length > 0) {
    const missingProviders = missingKeys.map(getProviderDisplayName)
    if (ctx?.get("principal")?.auth_method === "session") {
      console.error(`❌ Missing required provider API keys: ${missingProviders.join(", ")}`)
      console.error("   → Configure them in Settings → Providers")
    } else {
      console.warn(`⚠️  Missing provider API keys: ${missingProviders.join(", ")}`)
      console.warn("   Add them in Settings → Providers or set them in your .env file")
    }
  }

  // Cache in runtime context for reuse during this workflow
  if (ctx) {
    ctx.set("providerConfig", providers)
    console.log("[buildProviderConfig] Cached provider config in runtime context")
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
  const ctx = getExecutionContext()

  // Use cached Models instance if present
  if (ctx?.has("modelsInstance")) {
    return ctx.get("modelsInstance") as Models
  }

  const providers = await buildProviderConfig()

  const modelsConfig: ModelsConfig = {
    providers,
    tiers: buildTierConfigFromDefaults(),
    defaultTier: "default",
    trackPerformance: true,
    trackCost: true,
  }

  const instance = createModels(modelsConfig)

  // Cache in runtime context for reuse during this workflow
  if (ctx) {
    ctx.set("modelsInstance", instance)
  }

  return instance
}

/**
 * Reset the cached models instance (useful for testing or config changes).
 * @deprecated No longer uses singleton pattern - kept for backward compatibility
 */
export function resetModelsInstance(): void {
  const ctx = getExecutionContext()
  if (ctx) {
    ctx.delete("modelsInstance")
    ctx.delete("providerConfig")
  }
}
