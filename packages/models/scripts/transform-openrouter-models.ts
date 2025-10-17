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
// write to file
import type { ModelEntry } from "@lucky/shared"
import type { OpenRouterModel, OpenRouterResponse } from "../src/openrouter.types"

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
 * Estimate intelligence based on model name and pricing
 * Higher prices generally indicate more capable models
 */
function estimateIntelligence(model: OpenRouterModel): number {
  const name = model.id.toLowerCase()
  const inputPrice = parsePricing(model.pricing.prompt)
  const outputPrice = parsePricing(model.pricing.completion)
  const avgPrice = (inputPrice + outputPrice) / 2

  // start with base intelligence from naming
  let intelligence = 5 // default baseline

  // reasoning models get high intelligence
  if (name.includes("o1") || name.includes("o3") || name.includes("reasoning")) {
    intelligence = 10
    return intelligence // reasoning models are always high intelligence
  }

  // adjust based on model tier indicators in name
  if (name.includes("nano") || name.includes("lite")) {
    intelligence = 4
  } else if (name.includes("mini") || name.includes("flash") || name.includes("haiku")) {
    intelligence = 5
  } else if (name.includes("small")) {
    intelligence = 6
  } else if (name.includes("medium") || name.includes("sonnet")) {
    intelligence = 7
  } else if (name.includes("large") || name.includes("pro")) {
    intelligence = 7
  } else if (name.includes("opus") || name.includes("ultra")) {
    intelligence = 8
  }

  // adjust based on price (higher price = more capable)
  // if price is very high but name suggests lower tier, trust the price
  if (avgPrice > 10) {
    intelligence = Math.max(intelligence, 9) // very expensive = very smart
  } else if (avgPrice > 5) {
    intelligence = Math.max(intelligence, 8) // expensive = smart
  } else if (avgPrice > 2) {
    intelligence = Math.max(intelligence, 7) // medium price = decent
  } else if (avgPrice > 0.5) {
    intelligence = Math.max(intelligence, 6) // low price = budget
  } else if (avgPrice > 0.1) {
    intelligence = Math.max(intelligence, 5) // very low price = basic
  } else {
    intelligence = Math.min(intelligence, 4) // free/nearly free = minimal
  }

  // if name says "pro" but price is low, downgrade
  if (name.includes("pro") && avgPrice < 1) {
    intelligence = Math.min(intelligence, 6) // marketing "pro", not actually pro
  }

  // if name says "lite/mini/nano" but price is high, upgrade
  if ((name.includes("lite") || name.includes("mini") || name.includes("nano")) && avgPrice > 2) {
    intelligence = Math.min(intelligence + 2, 8) // priced higher than expected
  }

  // clamp between 1 and 10
  return Math.max(1, Math.min(10, intelligence))
}

/**
 * Estimate speed based on model name
 */
function estimateSpeed(model: OpenRouterModel): "fast" | "medium" | "slow" {
  const name = model.id.toLowerCase()

  if (
    name.includes("flash") ||
    name.includes("turbo") ||
    name.includes("mini") ||
    name.includes("nano") ||
    name.includes("lite")
  ) {
    return "fast"
  }

  if (name.includes("o1") || name.includes("o3") || name.includes("reasoning")) {
    return "slow"
  }

  return "medium"
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
 */
function supportsVision(model: OpenRouterModel): boolean {
  const name = model.id.toLowerCase()
  const modality = model.architecture?.modality?.toLowerCase() || ""

  return (
    modality.includes("image") ||
    modality.includes("vision") ||
    name.includes("vision") ||
    name.includes("gpt-4o") ||
    name.includes("claude-3") ||
    name.includes("gemini-2") ||
    name.includes("gemini-pro")
  )
}

/**
 * Check if model supports reasoning
 */
function supportsReasoning(model: OpenRouterModel): boolean {
  const name = model.id.toLowerCase()
  return name.includes("o1") || name.includes("o3") || name.includes("reasoning")
}

/**
 * Transform OpenRouter model to ModelEntry
 */
function transformModel(model: OpenRouterModel): ModelEntry {
  const inputPrice = parsePricing(model.pricing.prompt)
  const outputPrice = parsePricing(model.pricing.completion)

  // calculate cached input price (typically 1/3 of input price)
  const cachedInput = inputPrice > 0 ? inputPrice / 3 : null

  return {
    id: `openrouter#${model.id}`,
    provider: "openrouter",
    model: model.id,
    input: inputPrice,
    output: outputPrice,
    cachedInput,
    contextLength: model.context_length,
    supportsTools: true, // most modern models support tools
    supportsJsonMode: true, // most modern models support JSON mode
    supportsStreaming: true, // all models support streaming via OpenRouter
    supportsVision: supportsVision(model),
    supportsReasoning: supportsReasoning(model),
    supportsAudio: false, // rare, manually configure
    supportsVideo: false, // rare, manually configure
    speed: estimateSpeed(model),
    intelligence: estimateIntelligence(model),
    pricingTier: getPricingTier(inputPrice, outputPrice),
    active: false, // manually configure which models are active
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
    lines.push(`    id: "${model.id}",`)
    lines.push(`    provider: "${model.provider}",`)
    lines.push(`    model: "${model.model}",`)
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
    lines.push(`    active: ${model.active},`)
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

  const data = (await response.json()) as OpenRouterResponse
  console.log(`Fetched ${data.data.length} models from OpenRouter`)

  // transform models
  const transformed = data.data.map(transformModel)

  // filter to only desired providers (customize this as needed)
  const filtered = transformed.filter(
    m =>
      m.model.includes("google/") ||
      m.model.includes("openai/") ||
      m.model.includes("anthropic/") ||
      m.model.includes("switchpoint/") ||
      m.model.includes("meta-llama/") ||
      m.model.includes("mistralai/") ||
      m.model.includes("x-ai/") ||
      m.model.includes("moonshotai/"),
  )

  console.log(`Filtered to ${filtered.length} models`)

  // sort by provider and model name
  filtered.sort((a, b) => {
    if (a.model < b.model) return -1
    if (a.model > b.model) return 1
    return 0
  })

  // generate code
  const code = generateCatalogCode(filtered)

  const outputPath = path.join(import.meta.dir, "../src/pricing/openrouter-models.ts")
  await fs.writeFile(outputPath, code, "utf-8")

  console.log(`\n✅ Generated ${filtered.length} model entries`)
  console.log(`📝 Written to: ${outputPath}`)
  console.log("\nNOTE: Review and manually configure:")
  console.log("  - active: true for models you want to enable")
  console.log("  - supportsVision/Audio/Video based on model capabilities")
  console.log("  - intelligence ratings based on benchmarks")
}

main().catch(console.error)
