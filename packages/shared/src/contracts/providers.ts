/**
 * Provider Configuration Contracts
 * Zod schemas for provider settings, API keys, and validation
 */

import { z } from "zod"

/**
 * Provider name schema - validated against MODEL_CATALOG at runtime
 * This is a string type that gets validated dynamically
 */
export const providerNameSchema = z.enum(["openai", "openrouter", "groq"])

export type LuckyProvider = z.infer<typeof providerNameSchema>
/**
 * Provider API key mapping schema
 * Maps provider names to their required API key environment variable names
 */
export const providerKeyMappingSchema = z.object({
  provider: providerNameSchema,
  keyName: z.string(),
  keyPrefix: z.string().optional(),
  required: z.boolean().default(true),
})

export type ProviderKeyMapping = z.infer<typeof providerKeyMappingSchema>

/**
 * Provider configuration schema for user settings
 */
export const providerSettingsSchema = z.object({
  provider: providerNameSchema,
  enabledModels: z.array(z.string()).default([]),
  isEnabled: z.boolean().default(true),
})

export type ProviderSettings = z.infer<typeof providerSettingsSchema>

/**
 * Provider configuration with API key status
 */
export const providerConfigSchema = z.object({
  provider: providerNameSchema,
  enabledModels: z.array(z.string()),
  isEnabled: z.boolean(),
  hasApiKey: z.boolean(),
  apiKeyName: z.string(),
  totalModels: z.number(),
  activeModels: z.number(),
})

export type ProviderConfig = z.infer<typeof providerConfigSchema>

/**
 * API key validation result schema
 */
export const apiKeyValidationSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
  provider: providerNameSchema.optional(),
})

export type ApiKeyValidation = z.infer<typeof apiKeyValidationSchema>

/**
 * Provider status schema for UI display
 */
export const providerStatusSchema = z.enum(["configured", "partial", "unconfigured", "disabled"])

export type ProviderStatus = z.infer<typeof providerStatusSchema>

/**
 * Model ID schema - for user model preferences (stores API-format model names)
 * Examples: "gpt-4o-mini", "anthropic/claude-sonnet-4", "openrouter#openai/gpt-oss-20b"
 * These are NOT catalog IDs - they're what gets sent to the provider APIs
 */
export const modelIdSchema = z.string().min(1)

export type ModelId = z.infer<typeof modelIdSchema>

/**
 * Catalog ID type - enforces "<provider>#<model>" format for internal catalog lookups
 * This keeps catalog identifiers distinct from API-format model names.
 * WARNING: Never parse this string to determine the API provider - always look up in MODEL_CATALOG.
 *
 * @example
 * ```ts
 * "openai#gpt-4.1-mini" // ✓ correct catalog ID
 * "openrouter#anthropic/claude-sonnet-4" // ✓ correct (uses OpenRouter models)
 * "gpt-4.1-mini" // ✗ missing provider prefix
 * "openrouter#openai/gpt-4.1-mini" // ✗ old format
 * ```
 */
export type CatalogId = `${string}#${string}`

const allowedVendors = ["openai", "openrouter", "groq"] as const

const catalogIdPattern = new RegExp(`^(${allowedVendors.join("|")})#[^#]+$`)

/**
 * Catalog ID schema - validates catalog IDs match the vendor/model format
 */
export const catalogIdSchema = z
  .string()
  .min(3)
  .refine((id): id is CatalogId => catalogIdPattern.test(id), {
    message: "Catalog ID must follow format '<provider>#<model>'",
  })

/**
 * Enhanced user provider settings with metadata
 */
export const userProviderSettingsSchema = z.object({
  provider: providerNameSchema,
  enabledModels: z.array(modelIdSchema),
  isEnabled: z.boolean(),
  metadata: z
    .object({
      apiKeyConfigured: z.boolean(),
      lastUpdated: z.string().datetime(),
    })
    .optional(),
})

export type UserProviderSettings = z.infer<typeof userProviderSettingsSchema>

/**
 * Complete user model preferences across all providers
 */
export const userModelPreferencesSchema = z.object({
  providers: z.array(userProviderSettingsSchema),
  lastSynced: z.string().datetime(),
})

export type UserModelPreferences = z.infer<typeof userModelPreferencesSchema>
