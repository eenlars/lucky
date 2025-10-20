/**
 * Singleton Models instance for the Facade
 *
 * This creates a default Models instance that the Facade uses internally.
 * Configured with environment variables.
 */

import { PROVIDER_AVAILABILITY } from "@lucky/shared/contracts/config"
import { Models } from "./models"
import type { ModelsConfig, ProviderConfig } from "./types"

let modelsInstance: Models | null = null

/**
 * Build provider configuration from environment variables
 * Only configures ENABLED providers (respects PROVIDER_AVAILABILITY flags)
 */
function buildProviderConfig(): Record<string, ProviderConfig> {
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true"
  const providers: Record<string, ProviderConfig> = {}

  // OpenAI
  if (PROVIDER_AVAILABILITY.openai) {
    const openaiKey = process.env.OPENAI_API_KEY || (isTest ? "test-key" : undefined)
    if (openaiKey) {
      providers.openai = {
        id: "openai",
        apiKey: openaiKey,
        enabled: true,
      }
    }
  }

  // OpenRouter (currently disabled)
  if (PROVIDER_AVAILABILITY.openrouter) {
    const openrouterKey = process.env.OPENROUTER_API_KEY || (isTest ? "test-key" : undefined)
    if (openrouterKey) {
      providers.openrouter = {
        id: "openrouter",
        apiKey: openrouterKey,
        baseUrl: "https://openrouter.ai/api/v1",
        enabled: true,
      }
    }
  }

  // Groq (currently disabled)
  if (PROVIDER_AVAILABILITY.groq) {
    const groqKey = process.env.GROQ_API_KEY || (isTest ? "test-key" : undefined)
    if (groqKey) {
      providers.groq = {
        id: "groq",
        apiKey: groqKey,
        baseUrl: "https://api.groq.com/openai/v1",
        enabled: true,
      }
    }
  }

  return providers
}

/**
 * Get or create singleton Models instance
 */
export function getModelsInstance(): Models {
  if (!modelsInstance) {
    const config: ModelsConfig = {
      providers: buildProviderConfig(),
      trackPerformance: true,
      trackCost: true,
    }

    modelsInstance = new Models(config)
  }

  return modelsInstance
}
