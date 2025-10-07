/**
 * Zod schemas for runtime validation of all config types
 */

import { z } from "zod"

// ============================================================================
// Provider Configuration Schema
// ============================================================================

export const providerConfigSchema = z.object({
  id: z.string().min(1, "Provider ID is required"),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  maxConcurrent: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
  enabled: z.boolean().optional().default(true),
  headers: z.record(z.string()).optional(),
})

export const providersConfigSchema = z.record(providerConfigSchema)

// ============================================================================
// Execution Strategy Schema
// ============================================================================

export const executionStrategySchema = z.enum(["first", "race", "consensus", "fallback"])

// ============================================================================
// Model Specification Schema
// ============================================================================

export const modelSpecSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  model: z.string().min(1, "Model is required"),
  config: providerConfigSchema.partial().optional(),
})

export const modelSpecStringSchema = z
  .string()
  .min(1)
  .refine(
    val => val.includes("/") || val.startsWith("tier:") || val.startsWith("user:"),
    "Model spec must be in format 'provider/model', 'tier:name', or 'user:userId:experiment'",
  )

export const modelSpecUnionSchema = z.union([modelSpecSchema, modelSpecStringSchema])

// ============================================================================
// Tier Configuration Schema
// ============================================================================

export const tierConfigSchema = z.object({
  strategy: executionStrategySchema,
  models: z.array(modelSpecSchema).min(1, "At least one model is required"),
  timeout: z.number().int().positive().optional(),
  maxCost: z.number().positive().optional(),
})

export const tiersConfigSchema = z.record(tierConfigSchema)

// ============================================================================
// Models Configuration Schema
// ============================================================================

export const modelsConfigSchema = z.object({
  providers: providersConfigSchema,
  tiers: tiersConfigSchema.optional(),
  defaultTier: z.string().optional(),
  trackPerformance: z.boolean().optional().default(false),
  trackCost: z.boolean().optional().default(false),
})

// ============================================================================
// User Configuration Schemas (for YAML configs)
// ============================================================================

export const experimentConfigSchema = z.object({
  strategy: executionStrategySchema,
  providers: z
    .array(z.string())
    .min(1, "At least one provider is required")
    .describe("Array of provider/model strings like 'openai/gpt-4o-mini'"),
  timeout: z.number().int().positive().optional(),
  maxCost: z.number().positive().optional(),
})

export const experimentsConfigSchema = z.record(experimentConfigSchema)

export const userConfigDefaultsSchema = z.object({
  experiment: z.string().optional(),
  maxConcurrent: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
  costLimit: z.number().positive().optional(),
})

export const userConfigSchema = z.object({
  name: z.string().min(1, "Config name is required"),
  experiments: experimentsConfigSchema.optional(),
  defaults: userConfigDefaultsSchema.optional(),
  performanceTracking: z.boolean().optional().default(false),
})

// ============================================================================
// Execution Context Schema
// ============================================================================

export const executionContextSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
  userId: z.string().optional(),
  experiment: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

// ============================================================================
// Metrics Schemas
// ============================================================================

export const tokenUsageSchema = z.object({
  input: z.number().int().nonnegative(),
  output: z.number().int().nonnegative(),
  cached: z.number().int().nonnegative().optional(),
})

export const providerMetricsSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  requests: z.number().int().nonnegative(),
  successes: z.number().int().nonnegative(),
  failures: z.number().int().nonnegative(),
  avgLatency: z.number().nonnegative(),
  p95Latency: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  updatedAt: z.number().int().positive(),
})

export const modelResultMetricsSchema = z.object({
  latency: z.number().nonnegative(),
  cost: z.number().nonnegative().optional(),
  tokenUsage: tokenUsageSchema.optional(),
})

export const modelResultFallbackSchema = z.object({
  attempted: z.array(z.string()),
  reason: z.string(),
})

export const modelResultSchema = z.object({
  data: z.unknown(),
  provider: z.string().min(1),
  model: z.string().min(1),
  metrics: modelResultMetricsSchema,
  fallback: modelResultFallbackSchema.optional(),
})

// ============================================================================
// Type Inference Helpers
// ============================================================================

export type ProviderConfigInput = z.input<typeof providerConfigSchema>
export type ProviderConfigOutput = z.output<typeof providerConfigSchema>

export type ModelSpecInput = z.input<typeof modelSpecSchema>
export type ModelSpecOutput = z.output<typeof modelSpecSchema>

export type TierConfigInput = z.input<typeof tierConfigSchema>
export type TierConfigOutput = z.output<typeof tierConfigSchema>

export type ModelsConfigInput = z.input<typeof modelsConfigSchema>
export type ModelsConfigOutput = z.output<typeof modelsConfigSchema>

export type UserConfigInput = z.input<typeof userConfigSchema>
export type UserConfigOutput = z.output<typeof userConfigSchema>

export type ExecutionContextInput = z.input<typeof executionContextSchema>
export type ExecutionContextOutput = z.output<typeof executionContextSchema>

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate models config with detailed error messages
 */
export function validateModelsConfig(config: unknown) {
  return modelsConfigSchema.parse(config)
}

/**
 * Validate user config with detailed error messages
 */
export function validateUserConfig(config: unknown) {
  return userConfigSchema.parse(config)
}

/**
 * Safe validation that returns result object
 */
export function safeValidateModelsConfig(config: unknown) {
  return modelsConfigSchema.safeParse(config)
}

/**
 * Safe validation for user config
 */
export function safeValidateUserConfig(config: unknown) {
  return userConfigSchema.safeParse(config)
}
