/**
 * Provider Configuration Contracts
 * Zod schemas for provider settings, API keys, and validation
 */

import { z } from "zod"

/**
 * Provider name schema - validated against MODEL_CATALOG at runtime
 * This is a string type that gets validated dynamically
 */
export const gatewayNameSchema = z.enum(["openai-api", "openrouter-api", "groq-api"])

export type LuckyGateway = z.infer<typeof gatewayNameSchema>

export const GATEWAY_AVAILABILITY = {
  "openai-api": true,
  "openrouter-api": true,
  "groq-api": true, // Enable Groq in all environments for proper BYOK isolation
} as const

/**
 * Provider entry schema - defines provider metadata for models package
 *
 * @example
 * {
 *    "openai-api",
 *   displayName: "OpenAI",
 *   secretKeyName: "OPENAI_API_KEY",  // Environment variable name
 *   apiKeyValuePrefix: "sk-"          // Prefix in actual key value
 * }
 */
export const gatewayEntrySchema = z.object({
  /** Provider identifier (e.g., "openai", "groq") */
  gateway: gatewayNameSchema,
  /** Display name for UI (e.g., "OpenAI", "Groq") */
  displayName: z.string(),
  /** Environment variable name for API key (e.g., "OPENAI_API_KEY") */
  secretKeyName: z.string(),
  /** Prefix that appears in actual API key values (e.g., "sk-" for OpenAI, "gsk_" for Groq) */
  apiKeyValuePrefix: z.string(),
})

export type GatewayEntry = z.infer<typeof gatewayEntrySchema>

/**
 * Provider API key mapping schema
 * Maps provider names to their required API key environment variable names
 */
export const gatewayKeyMappingSchema = z.object({
  gateway: gatewayNameSchema,
  keyName: z.string(),
  keyPrefix: z.string().optional(),
  required: z.boolean().default(true),
})

export type GatewayKeyMapping = z.infer<typeof gatewayKeyMappingSchema>

/**
 * Provider configuration schema for user settings
 */
export const gatewaySettingsSchema = z.object({
  gatewayNameSchema,
  enabledModels: z.array(z.string()).default([]),
  isEnabled: z.boolean().default(true),
})

export type GatewaySettings = z.infer<typeof gatewaySettingsSchema>

/**
 * Provider configuration with API key status
 */
export const gatewayConfigSchema = z.object({
  gatewayNameSchema,
  enabledModels: z.array(z.string()),
  isEnabled: z.boolean(),
  hasApiKey: z.boolean(),
  /** Environment variable name for the API key (e.g., "OPENAI_API_KEY") */
  secretKeyName: z.string(),
  /** The actual API key value */
  apiKeyValue: z.string(),
  totalModels: z.number(),
  activeModels: z.number(),
})

export type GatewayConfig = z.infer<typeof gatewayConfigSchema>

/**
 * API key validation result schema
 */
export const gatewayApiKeyValidationSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
  gateway: gatewayNameSchema,
})

export type GatewayApiKeyValidation = z.infer<typeof gatewayApiKeyValidationSchema>

/**
 * Provider status schema for UI display
 */
export const gatewayStatusSchema = z.enum(["configured", "partial", "unconfigured", "disabled"])

export type GatewayStatus = z.infer<typeof gatewayStatusSchema>

/**
 * Model ID schema - for user model preferences (stores API-format model names)
 * Examples: "gpt-4o-mini", "anthropic/claude-sonnet-4", "openai/gpt-oss-20b"
 * These are NOT catalog IDs - they're what gets sent to the provider APIs
 */
export const modelIdSchema = z.string().min(1)

export type ModelId = z.infer<typeof modelIdSchema>

/**
 * Enhanced user provider settings with metadata
 */
export const userGatewaySettingsSchema = z.object({
  gateway: gatewayNameSchema,
  enabledModels: z.array(modelIdSchema),
  isEnabled: z.boolean(),
  metadata: z
    .object({
      apiKeyConfigured: z.boolean(),
      lastUpdated: z.string().datetime(),
    })
    .optional(),
})

export type UserGatewaySettings = z.infer<typeof userGatewaySettingsSchema>

/**
 * Complete user model preferences across all providers
 */
export const userGatewayPreferencesSchema = z.object({
  gateways: z.array(userGatewaySettingsSchema),
  lastSynced: z.string().datetime(),
})

export type UserGatewayPreferences = z.infer<typeof userGatewayPreferencesSchema>
