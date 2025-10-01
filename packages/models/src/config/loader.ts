/**
 * Configuration loader for user configs
 * Supports both TypeScript (.ts, .config.ts) and YAML (.yaml, .yml) files
 * Includes Zod validation for runtime safety
 */

import { readFile } from "fs/promises"
import { parse as parseYaml } from "yaml"
import { pathToFileURL } from "url"
import type { UserConfig } from "../types/config"
import { userConfigSchema } from "../types/schemas"

export class ConfigLoader {
  private userConfigs = new Map<string, UserConfig>()

  /**
   * Load a user config from a file (TypeScript or YAML)
   *
   * Supports:
   * - TypeScript: .ts, .config.ts (with defineConfig())
   * - YAML: .yaml, .yml (legacy support)
   *
   * TypeScript configs are preferred as they provide:
   * - Type safety at authoring time
   * - IDE autocomplete and validation
   * - Immediate feedback on errors
   */
  async load(path: string): Promise<UserConfig> {
    const isTypeScript = path.endsWith(".ts") || path.endsWith(".config.ts")
    const isYaml = path.endsWith(".yaml") || path.endsWith(".yml")

    if (!isTypeScript && !isYaml) {
      throw new Error(
        `Unsupported config file format: ${path}. Use .ts, .config.ts, .yaml, or .yml`
      )
    }

    let config: UserConfig

    if (isTypeScript) {
      // Load TypeScript config using dynamic import
      // Convert to file:// URL for proper ESM import
      const fileUrl = pathToFileURL(path).href
      const module = await import(fileUrl)
      const rawConfig = module.default || module

      // Validate with Zod (TypeScript configs may skip defineConfig validation)
      config = userConfigSchema.parse(rawConfig)
    } else {
      // Load YAML config (legacy support)
      const content = await readFile(path, "utf-8")
      const rawConfig = parseYaml(content)

      // Validate with Zod (throws on error with detailed messages)
      config = userConfigSchema.parse(rawConfig)
    }

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
