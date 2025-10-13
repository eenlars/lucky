/**
 * Server-only exports for @lucky/models
 * These modules use Node.js APIs and should only be imported in server-side code
 */

import { ConfigLoader } from "./config/loader"
import { Models } from "./models"
import type { ModelSpec, ModelsConfig } from "./types"
import type { UserConfig } from "./types/config"

export { ConfigLoader } from "./config/loader"

/**
 * Extended Models class with server-side functionality
 * Includes support for loading user configurations from YAML files
 */
export class ServerModels extends Models {
  private configLoader: ConfigLoader

  constructor(config: ModelsConfig) {
    super(config)
    this.configLoader = new ConfigLoader()
  }

  /**
   * Load user configuration from YAML
   */
  async loadUserConfig(userId: string, path: string): Promise<void> {
    const config = await this.configLoader.load(path)
    this.configLoader.setUserConfig(userId, config)
  }

  /**
   * Get user configuration
   */
  getUserConfig(userId: string): UserConfig | undefined {
    return this.configLoader.getUserConfig(userId)
  }

  /**
   * Clear user configuration
   */
  clearUserConfig(userId: string): void {
    this.configLoader.clearUserConfig(userId)
  }

  /**
   * Clear all user configurations
   */
  clearAllUserConfigs(): void {
    this.configLoader.clearAll()
  }

  /**
   * Resolve user config references
   */
  protected async resolveUserConfig(userId: string, experimentName?: string): Promise<ModelSpec> {
    const config = this.configLoader.getUserConfig(userId)
    if (!config) {
      throw new Error(`No config found for user ${userId}`)
    }

    // Get experiment name
    const experiment = experimentName || config.defaults?.experiment
    if (!experiment) {
      throw new Error("No experiment specified")
    }

    const experimentConfig = config.experiments?.[experiment]
    if (!experimentConfig) {
      throw new Error(`Experiment ${experiment} not found`)
    }

    // Get first provider from experiment
    // TODO: Implement strategy-based selection
    const providerStr = experimentConfig.providers[0]
    if (!providerStr) {
      throw new Error(`No providers in experiment ${experiment}`)
    }

    const [provider, model] = providerStr.split("/", 2)
    return { provider, model }
  }
}
