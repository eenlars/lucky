/**
 * Model Contracts
 * Zod schemas for model definitions, capabilities, and metadata
 */

import { z } from "zod"

/**
 * Model speed tier schema
 */
export const modelSpeedSchema = z.enum(["fast", "medium", "slow"])

export type ModelSpeed = z.infer<typeof modelSpeedSchema>

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

/**
 * Complete model entry schema - single source of truth for model definitions
 *
 * ⚠️ CRITICAL FIELD USAGE:
 *
 * - `id`: ONLY for catalog lookup/search (always prefixed: "openai/gpt-4o")
 *           ❌ DO NOT use this when calling provider APIs!
 *
 * - `model`: USE THIS for provider API calls and storage (provider-specific format)
 *            ✅ OpenAI: unprefixed ("gpt-4o")
 *            ✅ OpenRouter: prefixed ("anthropic/claude-sonnet-4")
 *
 * - `provider`: Determines which API endpoint to use and which API key is needed
 *
 * WRONG EXAMPLE: Sending catalog.id to OpenAI API ❌
 *   const entry = MODEL_CATALOG.find(e => e.id === "openai/gpt-4o")
 *   openai.chat(entry.id)  // ❌ Will fail! OpenAI doesn't accept "openai/gpt-4o"
 *
 * RIGHT EXAMPLE: Sending catalog.model to provider API ✅
 *   const entry = MODEL_CATALOG.find(e => e.id === "openai/gpt-4o")
 *   openai.chat(entry.model)  // ✅ Correct! Sends "gpt-4o"
 */
export const modelEntrySchema = z.object({
  // Identity
  /** Catalog lookup ID (always prefixed) - DO NOT use for API calls! */
  id: z.string().min(1),
  /** Provider name (determines which API endpoint to use) */
  provider: z.string().min(1),
  /** Model identifier in provider-specific format - USE THIS for API calls! */
  model: z.string().min(1),

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
  active: z.boolean(),
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
  id: z.string(),
  name: z.string(),
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

/**
 * Model selection result schema
 * Result of intelligent model selection with metadata
 */
export const modelSelectionSchema = z.object({
  modelId: z.string(),
  provider: z.string(),
  model: z.string(),
  reason: z.string(),
  priceVersion: z.string(),
  inputCostPer1M: z.number().min(0),
  outputCostPer1M: z.number().min(0),
  capabilities: modelCapabilitiesSchema,
  performance: z.object({
    speed: modelSpeedSchema,
    intelligence: z.number().int().min(1).max(10),
  }),
  alternatives: z.array(z.string()).optional(),
  timestamp: z.number(),
})

export type ModelSelection = z.infer<typeof modelSelectionSchema>
