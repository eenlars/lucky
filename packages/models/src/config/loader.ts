/**
 * Configuration loader for YAML user configs
 * Includes Zod validation for runtime safety
 */

import { readFile } from "fs/promises"
import { parse as parseYaml } from "yaml"
import type { UserConfig } from "../types/config"
import { userConfigSchema } from "../types/schemas"

export class ConfigLoader {
  private userConfigs = new Map<string, UserConfig>()

  /**
   * Load a user config from a YAML file
   */
  async load(path: string): Promise<UserConfig> {
    const content = await readFile(path, "utf-8")
    const rawConfig = parseYaml(content)

    // Validate with Zod (throws on error with detailed messages)
    const config = userConfigSchema.parse(rawConfig)

    return config
  }

  /**
   * Set user config in memory
   */
  setUserConfig(userId: string, config: UserConfig): void {
    this.userConfigs.set(userId, config)
  }

  /**
   * Get user config
   */
  getUserConfig(userId: string): UserConfig | undefined {
    return this.userConfigs.get(userId)
  }

  /**
   * Clear user config
   */
  clearUserConfig(userId: string): void {
    this.userConfigs.delete(userId)
  }

  /**
   * Clear all user configs
   */
  clearAll(): void {
    this.userConfigs.clear()
  }
}
