import fs from "fs"

// run: bun scripts/fetchOpenRouterPricing.ts
// it outputs json files to scripts/pricing-data/
// you can replace the pricing in runtime/settings/models.ts with the new pricing

interface OpenRouterModel {
  id: string
  pricing?: Record<string, string>
  supported_parameters?: string[]
  context_length: number
  created?: number
}

interface TransformedPricing {
  id: string
  input: number
  output: number
  "cached-input"?: number
  context_length: number
  created?: number
}

async function fetchModels(): Promise<OpenRouterModel[]> {
  const response = await fetch("https://openrouter.ai/api/v1/models")
  const data = await response.json()
  return data.data
}

/**
 * Filters models that support structured_outputs, scales all pricing values
 * to per-million-token, produces a summary per model, and returns that
 * summary both as an object and as a sorted array by total cost.
 */
async function transformModels(roundDecimals = 6) {
  function round(val: number, decimals: number): number {
    return Number(val.toFixed(decimals))
  }

  const pricingSummary: Record<string, Omit<TransformedPricing, "id">> = {}

  const models = await fetchModels()

  const transformed = models
    // keep only models with structured_outputs
    .filter(
      m => Array.isArray(m.supported_parameters), //&&
      // m.supported_parameters.includes("structured_outputs")
    )
    .map(model => {
      // scale pricing tiers
      const scaled: Record<string, number> = {}
      for (const [tier, priceStr] of Object.entries(model.pricing || {})) {
        const num = parseFloat(priceStr) || 0
        scaled[tier] = round(num * 1e6, roundDecimals)
      }

      const inputCost = scaled.prompt || 0
      const outputCost = scaled.completion || 0
      const entry: Omit<TransformedPricing, "id"> = {
        input: inputCost,
        output: outputCost,
        context_length: model.context_length,
      }
      if (model.created) {
        entry.created = model.created
      }
      if (inputCost > 0) {
        entry["cached-input"] = round(inputCost / 3, roundDecimals)
      }

      pricingSummary[model.id] = entry

      return {
        ...model,
        pricing: scaled,
      }
    })

  const providers = ["anthropic", "openai", "google", "qwen", "meta-llama", "deepseek", "mistral"]

  // build a sorted array: lowest (input+output) → highest
  const sortedPricingSummary = Object.entries(pricingSummary)
    .map(([id, { input, output, context_length, ...rest }]) => ({
      id,
      input,
      output,
      context_length,
      ...rest,
      totalCost: round(input + output, roundDecimals),
    }))
    .sort((a, b) => {
      // sort by name first
      const nameComparison = a.id.localeCompare(b.id)
      if (nameComparison !== 0) return nameComparison

      // then by cost
      return a.totalCost - b.totalCost
    })
    .filter(
      //filter out anything that has more than 5 usd input
      m => m.input <= 5 && providers.includes(m.id.split("/")[0]),
    )
    .filter(
      // filter out anything older than 5 months
      m => {
        if (!m.created) return true
        const createdDate = new Date(m.created * 1000)
        const fiveMonthsAgo = new Date()
        fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5)
        return createdDate >= fiveMonthsAgo
      },
    )
    .map(({ totalCost, ...m }) => m)

  return {
    transformed,
    sortedPricingSummary,
  }
}

const { sortedPricingSummary, transformed } = await transformModels()

const scriptDir = new URL(".", import.meta.url).pathname
const dataDir = scriptDir + "pricing-data/"

// ensure directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

fs.writeFileSync(dataDir + "pricingSummary.json", JSON.stringify(sortedPricingSummary, null, 2))

fs.writeFileSync(dataDir + "transformed.json", JSON.stringify(transformed, null, 2))

console.log(`✅ Updated pricing data in ${dataDir}`)
console.log(`📊 Found ${sortedPricingSummary.length} models matching criteria`)
