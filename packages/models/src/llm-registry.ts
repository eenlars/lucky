/**
 * LLMRegistry - Main registry for managing AI models
 * Supports both BYOK (Bring Your Own Key) and shared key scenarios
 */

import { isValidApiKey } from "@lucky/models/utils/apikey"
import { isNir } from "@lucky/shared"
import type { FallbackKeys, RegistryConfig, UserConfig } from "./types"
import { UserModels } from "./user-models"

// Resource limits to prevent DOS attacks
const MAX_MODELS_PER_USER = 100
const MAX_API_KEYS = 50
const MAX_MODEL_ID_LENGTH = 200
const MAX_API_KEY_LENGTH = 500

function normalizeFallbackKeys(keys: FallbackKeys | undefined, context: "fallback" | "override"): FallbackKeys {
  if (!keys) return {}

  const normalized: FallbackKeys = {}
  for (const [provider, key] of Object.entries(keys)) {
    if (key == null) {
      continue
    }

    if (typeof key !== "string") {
      const prefix = context === "fallback" ? "Fallback" : "Override"
      throw new Error(`${prefix} API key for provider "${provider}" must be a string`)
    }

    if (key.length === 0) {
      continue
    }

    if (key.length > MAX_API_KEY_LENGTH) {
      const prefix = context === "fallback" ? "Fallback" : "Override"
      throw new Error(
        `${prefix} API key too long for provider "${provider}": maximum ${MAX_API_KEY_LENGTH} characters allowed`,
      )
    }

    if (!isValidApiKey(key)) {
      const prefix = context === "fallback" ? "Invalid fallback" : "Invalid override"
      throw new Error(`${prefix} API key for provider "${provider}": API keys must be ASCII-only`)
    }

    normalized[provider as keyof FallbackKeys] = key
  }

  return normalized
}

export class LLMRegistry {
  private fallbackKeys: FallbackKeys

  constructor(config: RegistryConfig) {
    this.fallbackKeys = config.fallbackKeys
  }

  /**
   * Create a user-specific models instance
   */
  forUser(config: UserConfig): UserModels {
    // validate userId
    if (config.userId == null || typeof config.userId !== "string") {
      throw new Error("userId must be a string")
    }

    // validate mode
    if (config.mode !== "byok" && config.mode !== "shared") {
      throw new Error('Mode must be "byok" or "shared"')
    }

    // validate models is an array
    if (!Array.isArray(config.models)) {
      throw new Error("models must be an array")
    }

    // enforce max models limit
    if (config.models.length > MAX_MODELS_PER_USER) {
      throw new Error(`Too many models: maximum ${MAX_MODELS_PER_USER} models allowed per user`)
    }

    // validate each model ID is a string with valid length
    for (const modelId of config.models) {
      if (typeof modelId !== "string") {
        throw new Error(`Model ID must be a string, got ${typeof modelId}`)
      }
      if (modelId.length > MAX_MODEL_ID_LENGTH) {
        throw new Error(`Model ID too long: maximum ${MAX_MODEL_ID_LENGTH} characters allowed`)
      }
    }

    // validate byok has keys
    if (config.mode === "byok") {
      if (isNir(config.apiKeys)) {
        throw new Error("BYOK mode requires apiKeys")
      }

      // enforce max API keys limit
      const apiKeyCount = Object.keys(config.apiKeys).length
      if (apiKeyCount > MAX_API_KEYS) {
        throw new Error(`Too many API keys: maximum ${MAX_API_KEYS} keys allowed`)
      }

      // validate each API key
      for (const [provider, key] of Object.entries(config.apiKeys)) {
        if (isNir(key) || key.trim().length === 0) {
          continue // skip empty keys
        }
        if (key.length > MAX_API_KEY_LENGTH) {
          throw new Error(
            `API key too long for provider "${provider}": maximum ${MAX_API_KEY_LENGTH} characters allowed`,
          )
        }
        if (!isValidApiKey(key)) {
          throw new Error(`Invalid API key for provider "${provider}": API keys must be ASCII-only`)
        }
      }

      // check that at least one valid key exists
      const hasValidKey = Object.values(config.apiKeys).some(
        key => !isNir(key) && key.trim().length > 0 && isValidApiKey(key),
      )

      if (!hasValidKey) {
        throw new Error("BYOK mode requires apiKeys")
      }
    }

    // make defensive copy of models array and trim whitespace
    const modelsCopy = config.models.map(m => {
      if (typeof m !== "string") {
        throw new Error(`Expected model to be a string, got ${typeof m}`)
      }
      return m.trim()
    })

    const fallbackOverrides = normalizeFallbackKeys(config.fallbackOverrides, "override")
    const mergedFallbackKeys =
      config.mode === "shared" && Object.keys(fallbackOverrides).length > 0
        ? { ...this.fallbackKeys, ...fallbackOverrides }
        : this.fallbackKeys

    return new UserModels(config.userId, config.mode, modelsCopy, config.apiKeys || {}, mergedFallbackKeys)
  }
}

/**
 * Create an LLM Registry instance
 */
export function createLLMRegistry(config: RegistryConfig): LLMRegistry {
  if (config.fallbackKeys == null || typeof config.fallbackKeys !== "object") {
    throw new Error("fallbackKeys must be a valid object")
  }

  const fallbackKeys = normalizeFallbackKeys(config.fallbackKeys, "fallback")

  // enforce max API keys limit
  const fallbackKeyCount = Object.keys(fallbackKeys).length
  if (fallbackKeyCount > MAX_API_KEYS) {
    throw new Error(`Too many fallback API keys: maximum ${MAX_API_KEYS} keys allowed`)
  }

  return new LLMRegistry({ fallbackKeys })
}
