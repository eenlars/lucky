/**
 * Transform OpenRouter API models to ModelEntry format
 *
 * Usage:
 *   bun run scripts/transform-openrouter-models.ts
 *
 * This script:
 * 1. Fetches models from OpenRouter API
 * 2. Transforms to ModelEntry format
 * 3. Outputs TypeScript code ready to paste into catalog.ts
 */

import fs from "node:fs/promises"
import path from "node:path"
import type { ModelSchemaOpenRouter } from "@lucky/models/llm-catalog/openrouter/openrouter.schema"
// write to file
import type { ModelEntry } from "@lucky/shared"

/**
 * Convert OpenRouter pricing string to number (per 1M tokens)
 */
function parsePricing(priceStr: string): number {
  const price = Number.parseFloat(priceStr)
  if (Number.isNaN(price)) {
    console.error(`Invalid pricing string: ${priceStr}`)
    return 0
  }
  return price * 1_000_000 // convert to per 1M tokens
}

/**
 * Estimate intelligence based on model capabilities and pricing
 * Combines multiple signals: reasoning capability, size indicators, price, context length
 */
function estimateIntelligence(model: ModelSchemaOpenRouter): number {
  const name = model.id.toLowerCase()
  const inputPrice = parsePricing(model.pricing.prompt || "0")
  const outputPrice = parsePricing(model.pricing.completion || "0")
  const avgPrice = (inputPrice + outputPrice) / 2

  // tier mapping for model size indicators (name-based)
  const tierMap: Record<string, number> = {
    nano: 3,
    lite: 4,
    mini: 5,
    flash: 5,
    haiku: 5,
    small: 6,
    medium: 7,
    sonnet: 7,
    large: 7,
    pro: 7,
    opus: 8,
    ultra: 8,
  }

  // start with base intelligence from naming
  let intelligence = 5 // default baseline

  // reasoning models are always high intelligence
  if (name.includes("o1") || name.includes("o3") || name.includes("reasoning")) {
    return 10
  }

  // find highest tier indicator in name
  for (const [tier, score] of Object.entries(tierMap)) {
    if (name.includes(tier)) {
      intelligence = score
      break // use first (most specific) match
    }
  }

  // price-based adjustments (override name hints)
  const priceScores: Array<[number, number]> = [
    [10, 9], // >$10/1M = very capable
    [5, 8], // >$5/1M = capable
    [2, 7], // >$2/1M = decent
    [0.5, 6], // >$0.5/1M = budget
    [0.1, 5], // >$0.1/1M = basic
    [0, 4], // $0 = minimal
  ]

  for (const [threshold, score] of priceScores) {
    if (avgPrice > threshold) {
      intelligence = Math.max(intelligence, score)
      break
    }
  }

  // context length signals capability
  if (model.context_length > 100_000) {
    intelligence = Math.max(intelligence, 8) // long context = advanced
  } else if (model.context_length > 32_000) {
    intelligence = Math.max(intelligence, 7) // medium-long context
  }

  // multimodal capabilities suggest higher intelligence
  const inputMods = model.architecture?.input_modalities?.length || 0
  const outputMods = model.architecture?.output_modalities?.length || 0
  if (inputMods > 2 || outputMods > 2) {
    intelligence = Math.max(intelligence, 7) // rich multimodal = capable
  }

  // clamp between 1 and 10
  return Math.max(1, Math.min(10, intelligence))
}

/**
 * Estimate speed based on model characteristics
 * Fast models: small, optimized variants; Slow models: reasoning-intensive
 */
function estimateSpeed(model: ModelSchemaOpenRouter): "fast" | "balanced" | "slow" {
  const name = model.id.toLowerCase()

  // reasoning models are inherently slow
  if (name.includes("o1") || name.includes("o3") || name.includes("reasoning")) {
    return "slow"
  }

  // optimized fast variants
  const fastIndicators = ["flash", "turbo", "mini", "nano", "lite", "instruct"]
  if (fastIndicators.some(indicator => name.includes(indicator))) {
    return "fast"
  }

  return "balanced"
}

/**
 * Determine pricing tier
 */
function getPricingTier(inputPrice: number, outputPrice: number): "low" | "medium" | "high" {
  const avgPrice = (inputPrice + outputPrice) / 2

  if (avgPrice < 1) return "low"
  if (avgPrice < 5) return "medium"
  return "high"
}

/**
 * Check if model supports vision
 * Uses structured modality data and generic fallback patterns
 */
function supportsVision(model: ModelSchemaOpenRouter): boolean {
  // primary: use structured modality data from schema
  if (model.architecture?.input_modalities?.includes("image")) {
    return true
  }

  // fallback: check generic modality descriptions
  const modality = model.architecture?.modality?.toLowerCase() || ""
  if (modality.includes("image") || modality.includes("vision")) {
    return true
  }

  // last resort: generic patterns (avoid specific model names)
  const name = model.id.toLowerCase()
  return name.includes("vision") || name.includes("-4o") || name.includes("-4-vision")
}

/**
 * Check if model supports reasoning
 */
function supportsReasoning(model: ModelSchemaOpenRouter): boolean {
  const name = model.id.toLowerCase()
  return name.includes("o1") || name.includes("o3") || name.includes("reasoning")
}

/**
 * Check if model supports tools
 * OpenRouter models expose this via the supported_parameters array
 */
function supportsTools(model: ModelSchemaOpenRouter): boolean {
  const supportedParams = model.supported_parameters || []
  return supportedParams.includes("tools")
}

/**
 * Check if model supports JSON mode
 * OpenRouter models expose this via the supported_parameters array
 */
function supportsJsonMode(model: ModelSchemaOpenRouter): boolean {
  const supportedParams = model.supported_parameters || []
  return supportedParams.includes("response_format") || supportedParams.includes("structured_outputs")
}

/**
 * Check if model supports audio (input or output)
 * Uses structured modality data from schema
 */
function supportsAudio(model: ModelSchemaOpenRouter): boolean {
  const inputModalities = model.architecture?.input_modalities || []
  const outputModalities = model.architecture?.output_modalities || []
  return inputModalities.includes("audio") || outputModalities.includes("audio")
}

/**
 * Transform OpenRouter model to ModelEntry
 * Prioritizes schema-provided values with sensible defaults as fallback
 */
function transformModel(model: ModelSchemaOpenRouter): ModelEntry {
  const inputPrice = parsePricing(model.pricing.prompt || "0")
  const outputPrice = parsePricing(model.pricing.completion || "0")

  // cached input pricing: use schema value if available, fallback to 1/3 of input
  let cachedInput: number | null = null
  if (model.pricing.input_cache_read) {
    cachedInput = parsePricing(model.pricing.input_cache_read)
  } else if (inputPrice > 0) {
    cachedInput = inputPrice / 3 // standard estimate when not specified
  }

  return {
    gateway: "openrouter-api",
    gatewayModelId: model.id,
    input: inputPrice,
    output: outputPrice,
    cachedInput,
    contextLength: model.context_length,
    supportsTools: supportsTools(model),
    supportsJsonMode: supportsJsonMode(model),
    supportsStreaming: true, // all models on OpenRouter support streaming
    supportsVision: supportsVision(model),
    supportsReasoning: supportsReasoning(model),
    supportsAudio: supportsAudio(model),
    supportsVideo: false, // rare - manually configure as needed
    speed: estimateSpeed(model),
    intelligence: estimateIntelligence(model),
    pricingTier: getPricingTier(inputPrice, outputPrice),
    runtimeEnabled: false, // manually configure per deployment
    uiHiddenInProd: false, // manually configure per deployment
  }
}

/**
 * Generate TypeScript code for catalog entries
 */
function generateCatalogCode(models: ModelEntry[]): string {
  const lines: string[] = [
    "/**",
    " * OpenRouter Models",
    " * Generated by scripts/transform-openrouter-models.ts",
    " * DO NOT EDIT MANUALLY - regenerate by running the script",
    " */",
    "",
    'import type { ModelEntry } from "@lucky/shared"',
    "",
    "export const OPENROUTER_MODELS: ModelEntry[] = [",
  ]

  for (const model of models) {
    lines.push("  {")
    lines.push(`    gateway: "${model.gateway}",`)
    lines.push(`    gatewayModelId: "${model.gatewayModelId}",`)
    lines.push(`    input: ${model.input},`)
    lines.push(`    output: ${model.output},`)
    lines.push(`    cachedInput: ${model.cachedInput},`)
    lines.push(`    contextLength: ${model.contextLength},`)
    lines.push(`    supportsTools: ${model.supportsTools},`)
    lines.push(`    supportsJsonMode: ${model.supportsJsonMode},`)
    lines.push(`    supportsStreaming: ${model.supportsStreaming},`)
    lines.push(`    supportsVision: ${model.supportsVision},`)
    lines.push(`    supportsReasoning: ${model.supportsReasoning},`)
    lines.push(`    supportsAudio: ${model.supportsAudio},`)
    lines.push(`    supportsVideo: ${model.supportsVideo},`)
    lines.push(`    speed: "${model.speed}",`)
    lines.push(`    intelligence: ${model.intelligence},`)
    lines.push(`    pricingTier: "${model.pricingTier}",`)
    lines.push(`    runtimeEnabled: ${model.runtimeEnabled},`)
    lines.push(`    uiHiddenInProd: ${model.uiHiddenInProd},`)
    lines.push("  },")
    lines.push("")
  }

  lines.push("]")
  lines.push("")

  return lines.join("\n")
}

/**
 * Main function
 */
async function main() {
  console.log("Fetching models from OpenRouter API...")

  const response = await fetch("https://openrouter.ai/api/v1/models")
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`)
  }

  const data = (await response.json()) as { data: ModelSchemaOpenRouter[] }
  console.log(`Fetched ${data.data.length} models from OpenRouter`)

  // transform models
  const transformed = data.data.map(transformModel)

  // filter to only desired providers (customize this as needed)
  const filtered = transformed.filter(
    m =>
      m.gatewayModelId.includes("google/") ||
      m.gatewayModelId.includes("openai/") ||
      m.gatewayModelId.includes("anthropic/") ||
      m.gatewayModelId.includes("switchpoint/") ||
      m.gatewayModelId.includes("meta-llama/") ||
      m.gatewayModelId.includes("mistralai/") ||
      m.gatewayModelId.includes("x-ai/") ||
      m.gatewayModelId.includes("moonshotai/"),
  )

  console.log(`Filtered to ${filtered.length} models`)

  // sort by provider and model name
  filtered.sort((a, b) => {
    if (a.gatewayModelId < b.gatewayModelId) return -1
    if (a.gatewayModelId > b.gatewayModelId) return 1
    return 0
  })

  // generate code
  const code = generateCatalogCode(filtered)

  const outputPath = path.join(import.meta.dir, "../src/llm-catalog/pricing-generation/openrouter-models.ts")
  await fs.writeFile(outputPath, code, "utf-8")

  console.log(`\n✅ Generated ${filtered.length} model entries`)
  console.log(`📝 Written to: ${outputPath}`)
  console.log("\nNOTE: Review and manually configure:")
  console.log("  - runtimeEnabled: true for models you want to enable")
  console.log("  - uiHiddenInProd: true for models you want to hide in production")
  console.log("  - supportsVision/Audio/Video based on model capabilities")
  console.log("  - intelligence ratings based on benchmarks")
}

main().catch(console.error)
