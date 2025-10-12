/**
 * Provider Configuration Contracts
 * Zod schemas for provider settings, API keys, and validation
 */

import { z } from "zod"

/**
 * Provider name schema - validated against MODEL_CATALOG at runtime
 * This is a string type that gets validated dynamically
 */
export const providerNameSchema = z.string().min(1, "Provider name is required")

/**
 * API key schema with validation rules
 */
export const apiKeySchema = z
  .string()
  .min(10, "API key must be at least 10 characters")
  .max(512, "API key exceeds maximum length")

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
 * Model ID schema - validates model IDs match MODEL_CATALOG format
 * Format: "provider/model-name" (e.g., "openai/gpt-4o", "anthropic/claude-sonnet-4")
 * WARNING: Never parse this string to determine the API provider - always look up in MODEL_CATALOG
 */
export const modelIdSchema = z.string().min(3)

export type ModelId = z.infer<typeof modelIdSchema>

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
  defaultProvider: providerNameSchema.optional(),
  lastSynced: z.string().datetime(),
})

export type UserModelPreferences = z.infer<typeof userModelPreferencesSchema>
