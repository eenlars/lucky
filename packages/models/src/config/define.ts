/**
 * Configuration definition helper
 *
 * Provides type-safe configuration definition with runtime Zod validation.
 * Use this to define user configurations in TypeScript instead of YAML.
 *
 * @example
 * ```typescript
 * import { defineConfig } from '@lucky/models/config'
 *
 * export default defineConfig({
 *   name: "Research Config",
 *   experiments: {
 *     fast: {
 *       strategy: "race",
 *       providers: ["openrouter#openai/gpt-4o-mini", "anthropic/claude-3-5-haiku"]
 *     }
 *   },
 *   defaults: {
 *     experiment: "fast"
 *   }
 * })
 * ```
 */

import type { UserConfig } from "../types/schemas"
import { userConfigSchema } from "../types/schemas"

/**
 * Define a type-safe user configuration
 *
 * This function provides:
 * - Type safety at authoring time (IDE autocomplete, type checking)
 * - Runtime validation with Zod (detailed error messages)
 * - Immediate feedback on configuration errors
 *
 * @param config - User configuration object
 * @returns Validated configuration
 * @throws ZodError if configuration is invalid
 */
export function defineConfig(config: UserConfig): UserConfig {
  // Validate at definition time for immediate feedback
  // This catches errors early during development
  return userConfigSchema.parse(config)
}

/**
 * Define a configuration without runtime validation
 *
 * Use this if you want to skip validation at definition time
 * (validation will still happen when the config is loaded).
 *
 * @param config - User configuration object
 * @returns Configuration object (unvalidated)
 */
export function defineConfigUnsafe(config: UserConfig): UserConfig {
  return config
}
