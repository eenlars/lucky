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
