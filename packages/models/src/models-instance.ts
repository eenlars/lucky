/**
 * Singleton Models instance for the Facade
 *
 * This creates a default Models instance that the Facade uses internally.
 * Configured with environment variables.
 */

import {
  DEFAULT_PROVIDER_AVAILABILITY,
  type ProviderAvailability,
  resolveProviderAvailability,
} from "@lucky/shared/contracts/config"
import { Models } from "./models"
import type { ModelsConfig, ProviderConfig } from "./types"

let modelsInstance: Models | null = null

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  if (["1", "true", "yes", "on"].includes(normalized)) return true
  if (["0", "false", "no", "off"].includes(normalized)) return false
  return undefined
}

function getProviderAvailability(): ProviderAvailability {
  const overrides: Partial<ProviderAvailability> = {}

  const openai = parseBooleanEnv(process.env.MODELS_PROVIDER_OPENAI_ENABLED)
  if (openai !== undefined) overrides.openai = openai

  const openrouter = parseBooleanEnv(process.env.MODELS_PROVIDER_OPENROUTER_ENABLED)
  if (openrouter !== undefined) overrides.openrouter = openrouter

  const groq = parseBooleanEnv(process.env.MODELS_PROVIDER_GROQ_ENABLED)
  if (groq !== undefined) overrides.groq = groq

  if (Object.keys(overrides).length === 0) {
    return DEFAULT_PROVIDER_AVAILABILITY
  }

  return resolveProviderAvailability(overrides)
}

/**
 * Build provider configuration from environment variables
 * Only configures ENABLED providers (respects runtime availability flags)
 */
function buildProviderConfig(): Record<string, ProviderConfig> {
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true"
  const providers: Record<string, ProviderConfig> = {}
  const availability = getProviderAvailability()

  // OpenAI
  if (availability.openai) {
    const openaiKey = process.env.OPENAI_API_KEY || (isTest ? "test-key" : undefined)
    if (openaiKey) {
      providers.openai = {
        id: "openai",
        apiKey: openaiKey,
        enabled: true,
      }
    }
  }

  // OpenRouter
  if (availability.openrouter) {
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

  // Groq
  if (availability.groq) {
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

/**
 * Reset instance (for testing)
 */
export function resetModelsInstance(): void {
  modelsInstance = null
}
