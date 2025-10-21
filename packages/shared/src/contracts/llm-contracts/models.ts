/**
 * Model Contracts
 * Zod schemas for model definitions, capabilities, and metadata
 */

import { z } from "zod"
import { gatewayNameSchema } from "./providers"

// ============================================================================
// MODELS CONFIGURATION
// ============================================================================

export const ModelDefaultsSchema = z.object({
  summary: z.string().default("google/gemini-2.5-flash"),
  nano: z.string().default("google/gemini-2.5-flash"),
  low: z.string().default("google/gemini-2.5-flash"),
  balanced: z.string().default("google/gemini-2.5-flash"),
  high: z.string().default("google/gemini-2.5-flash"),
  default: z.string().default("google/gemini-2.5-flash"),
  fitness: z.string().default("google/gemini-2.5-flash"),
  reasoning: z.string().default("google/gemini-2.5-flash"),
  fallback: z.string().default("google/gemini-2.5-flash"),
})

export const ModelsConfigSchema = z.object({
  gateway: gatewayNameSchema.default("openai-api"),
  inactive: z.array(z.string()).default(["moonshotai/kimi-k2", "x-ai/grok-4", "qwen/qwq-32b:free"]),
  defaults: ModelDefaultsSchema.default({}),
})

export type ModelDefaults = z.infer<typeof ModelDefaultsSchema>
export type ModelsConfig = z.infer<typeof ModelsConfigSchema>

/**
 * Model speed tier schema
 * Accepts legacy "medium" but normalizes it to "balanced"
 */
const modelSpeedRawSchema = z.enum(["fast", "balanced", "slow"]).or(z.literal("medium"))

export const modelSpeedSchema = modelSpeedRawSchema.transform(speed => (speed === "medium" ? "balanced" : speed))

export type ModelSpeed = z.infer<typeof modelSpeedSchema>

/**
 * Model tier name schema - for intelligent model selection
 */
export const tierNameSchema = z.enum(["cheap", "fast", "smart", "balanced"])

export type TierName = z.infer<typeof tierNameSchema>

/**
 * Model pricing tier schema
 */
export const modelPricingTierSchema = z.enum(["low", "medium", "high"])

export type ModelPricingTier = z.infer<typeof modelPricingTierSchema>

/**
 * Model capabilities schema - defines what features a model supports
 */
export const modelCapabilitiesSchema = z.object({
  contextLength: z.number().int().positive(),
  supportsTools: z.boolean(),
  supportsJsonMode: z.boolean(),
  supportsStreaming: z.boolean(),
  supportsVision: z.boolean(),
  supportsReasoning: z.boolean(),
  supportsAudio: z.boolean(),
  supportsVideo: z.boolean(),
})

export type ModelCapabilities = z.infer<typeof modelCapabilitiesSchema>

/**
 * Model pricing schema - per 1M tokens in USD
 */
export const modelPricingSchema = z.object({
  input: z.number().min(0),
  output: z.number().min(0),
  cachedInput: z.number().min(0).nullable(),
})

export type ModelPricing = z.infer<typeof modelPricingSchema>

export const modelEntrySchema = z.object({
  // Identity
  /** Provider name (determines which API endpoint to use) */
  gateway: gatewayNameSchema,
  /** Model identifier in provider-specific format - USE THIS for API calls! ALSO THIS CAN POSSIBLY CONTAIN '/'! */
  gatewayModelId: z.string().min(1),

  // Pricing (per 1M tokens in USD)
  input: z.number().min(0),
  output: z.number().min(0),
  cachedInput: z.number().min(0).nullable(),

  // Capabilities
  contextLength: z.number().int().positive(),
  supportsTools: z.boolean(),
  supportsJsonMode: z.boolean(),
  supportsStreaming: z.boolean(),
  supportsVision: z.boolean(),
  supportsReasoning: z.boolean(),
  supportsAudio: z.boolean(),
  supportsVideo: z.boolean(),

  // Performance & Quality
  speed: modelSpeedSchema,
  intelligence: z.number().int().min(1).max(10),
  pricingTier: modelPricingTierSchema,

  // Availability
  /**
   * When true, the model is eligible for runtime selection and pricing.
   * Preferred name: runtimeEnabled. Legacy alias: active.
   */
  runtimeEnabled: z.boolean().optional(),
  /**
   * When true, hide the model from Provider Model Discovery in production UIs.
   * Preferred name: uiHiddenInProd. Legacy alias: disabled.
   */
  uiHiddenInProd: z.boolean().optional(),
  /**
   * DEPRECATED: use runtimeEnabled instead. Kept for catalog backward compatibility.
   * @deprecated this is deprecated
   */
  active: z.boolean().optional(),
  /**
   * DEPRECATED: use uiHiddenInProd instead. Kept for catalog backward compatibility.
   * @deprecated this is deprecated
   */
  disabled: z.boolean().optional(),
  regions: z.array(z.string()).optional(),

  // Metadata
  description: z.string().optional(),
  releaseDate: z.string().optional(),
})

export type ModelEntry = z.infer<typeof modelEntrySchema>

/**
 * Enriched model info for frontend display
 * Subset of ModelEntry with fields most relevant for UI
 */
export const enrichedModelInfoSchema = z.object({
  gatewayModelId: z.string(),
  gateway: gatewayNameSchema,
  contextLength: z.number().int().positive(),
  supportsTools: z.boolean(),
  supportsVision: z.boolean(),
  supportsReasoning: z.boolean(),
  supportsAudio: z.boolean(),
  supportsVideo: z.boolean(),
  inputCostPer1M: z.number().min(0),
  outputCostPer1M: z.number().min(0),
  speed: modelSpeedSchema,
  intelligence: z.number().int().min(1).max(10),
})

export type EnrichedModelInfo = z.infer<typeof enrichedModelInfoSchema>
