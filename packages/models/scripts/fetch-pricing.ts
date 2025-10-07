/**
 * Fetch latest pricing from various providers
 * Run with: bun run fetch-pricing
 */

import { writeFile } from "node:fs/promises"
import type { ModelPricing, PricingCache } from "../src/types/pricing"

interface OpenRouterModel {
  id: string
  pricing: {
    prompt: string
    completion: string
    request?: string
    image?: string
  }
  context_length?: number
  created?: number
}

/**
 * Fetch pricing from OpenRouter API
 */
async function fetchOpenRouterPricing(): Promise<ModelPricing[]> {
  console.log("Fetching OpenRouter pricing...")

  const response = await fetch("https://openrouter.ai/api/v1/models")
  const data = await response.json()

  const models: ModelPricing[] = []

  for (const model of data.data as OpenRouterModel[]) {
    const inputPrice = Number.parseFloat(model.pricing.prompt) * 1_000_000
    const outputPrice = Number.parseFloat(model.pricing.completion) * 1_000_000

    models.push({
      provider: "openrouter",
      model: model.id,
      inputPerMillion: inputPrice,
      outputPerMillion: outputPrice,
      updatedAt: Date.now(),
      source: "api",
    })
  }

  console.log(`✓ Fetched ${models.length} OpenRouter models`)
  return models
}

/**
 * Manual pricing for OpenAI (they don't have a public pricing API)
 */
function getOpenAIPricing(): ModelPricing[] {
  console.log("Loading OpenAI pricing...")

  const models: ModelPricing[] = [
    {
      provider: "openai",
      model: "gpt-4o",
      inputPerMillion: 2.5,
      outputPerMillion: 10.0,
      cachedInputPerMillion: 1.25,
      updatedAt: Date.now(),
      source: "manual",
    },
    {
      provider: "openai",
      model: "gpt-4o-mini",
      inputPerMillion: 0.15,
      outputPerMillion: 0.6,
      cachedInputPerMillion: 0.075,
      updatedAt: Date.now(),
      source: "manual",
    },
    {
      provider: "openai",
      model: "gpt-4-turbo",
      inputPerMillion: 10.0,
      outputPerMillion: 30.0,
      updatedAt: Date.now(),
      source: "manual",
    },
    {
      provider: "openai",
      model: "gpt-4",
      inputPerMillion: 30.0,
      outputPerMillion: 60.0,
      updatedAt: Date.now(),
      source: "manual",
    },
  ]

  console.log(`✓ Loaded ${models.length} OpenAI models`)
  return models
}

/**
 * Manual pricing for Anthropic (they don't have a public pricing API)
 */
function getAnthropicPricing(): ModelPricing[] {
  console.log("Loading Anthropic pricing...")

  const models: ModelPricing[] = [
    {
      provider: "anthropic",
      model: "claude-3.5-sonnet",
      inputPerMillion: 3.0,
      outputPerMillion: 15.0,
      updatedAt: Date.now(),
      source: "manual",
    },
    {
      provider: "anthropic",
      model: "claude-3.5-haiku",
      inputPerMillion: 0.25,
      outputPerMillion: 1.25,
      updatedAt: Date.now(),
      source: "manual",
    },
    {
      provider: "anthropic",
      model: "claude-3-opus",
      inputPerMillion: 15.0,
      outputPerMillion: 75.0,
      updatedAt: Date.now(),
      source: "manual",
    },
  ]

  console.log(`✓ Loaded ${models.length} Anthropic models`)
  return models
}

/**
 * Local models (free)
 */
function getLocalPricing(): ModelPricing[] {
  console.log("Loading local model pricing...")

  const models: ModelPricing[] = [
    {
      provider: "local",
      model: "llama-3.3",
      inputPerMillion: 0,
      outputPerMillion: 0,
      updatedAt: Date.now(),
      source: "manual",
    },
    {
      provider: "local",
      model: "mistral-7b",
      inputPerMillion: 0,
      outputPerMillion: 0,
      updatedAt: Date.now(),
      source: "manual",
    },
  ]

  console.log(`✓ Loaded ${models.length} local models`)
  return models
}

/**
 * Main function to fetch all pricing
 */
async function main() {
  console.log("\n🚀 Fetching model pricing...\n")

  try {
    // Fetch all pricing data
    const [openRouterPricing, openaiPricing, anthropicPricing, localPricing] = await Promise.all([
      fetchOpenRouterPricing(),
      Promise.resolve(getOpenAIPricing()),
      Promise.resolve(getAnthropicPricing()),
      Promise.resolve(getLocalPricing()),
    ])

    // Combine all pricing
    const allPricing = [...openRouterPricing, ...openaiPricing, ...anthropicPricing, ...localPricing]

    // Create pricing cache
    const cache: PricingCache = {
      models: Object.fromEntries(allPricing.map(p => [`${p.provider}/${p.model}`, p])),
      metadata: {
        lastUpdate: Date.now(),
        version: "1.0.0",
      },
    }

    // Write to file
    const outputPath = "./pricing-cache.json"
    await writeFile(outputPath, JSON.stringify(cache, null, 2))

    console.log(`\n✅ Pricing data saved to ${outputPath}`)
    console.log(`   Total models: ${allPricing.length}`)
    console.log(`   - OpenRouter: ${openRouterPricing.length}`)
    console.log(`   - OpenAI: ${openaiPricing.length}`)
    console.log(`   - Anthropic: ${anthropicPricing.length}`)
    console.log(`   - Local: ${localPricing.length}`)
  } catch (error) {
    console.error("\n❌ Error fetching pricing:", error)
    process.exit(1)
  }
}

// Run if executed directly
if (import.meta.main) {
  main()
}
