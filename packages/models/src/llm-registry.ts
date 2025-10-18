/**
 * LLMRegistry - Main registry for managing AI models
 * Supports both BYOK (Bring Your Own Key) and shared key scenarios
 */

import type { FallbackKeys, RegistryConfig, UserConfig } from "./types"
import { UserModels } from "./user-models"

export class LLMRegistry {
  private fallbackKeys: FallbackKeys

  constructor(config: RegistryConfig) {
    this.fallbackKeys = config.fallbackKeys
  }

  /**
   * Create a user-specific models instance
   */
  forUser(config: UserConfig): UserModels {
    // validate mode
    if (config.mode !== "byok" && config.mode !== "shared") {
      throw new Error('Mode must be "byok" or "shared"')
    }

    // validate models is an array
    if (!Array.isArray(config.models)) {
      throw new Error("models must be an array")
    }

    // validate byok has keys
    if (config.mode === "byok" && !config.apiKeys) {
      throw new Error("BYOK mode requires apiKeys")
    }

    // make defensive copy of models array and trim whitespace
    const modelsCopy = config.models.map(m => m.trim())

    return new UserModels(config.userId, config.mode, modelsCopy, config.apiKeys || {}, this.fallbackKeys)
  }
}

/**
 * Create an LLM Registry instance
 */
export function createLLMRegistry(config: RegistryConfig): LLMRegistry {
  return new LLMRegistry(config)
}
