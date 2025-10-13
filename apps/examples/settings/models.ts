import { providersV2 } from "@core/utils/spending/modelInfo"
import type { ModelName } from "@core/utils/spending/models.types"
import type { LuckyProvider, StandardModels } from "@lucky/shared"

/* ---------- DEFAULT MODELS ---------- */
export const DEFAULT_MODELS: Record<LuckyProvider, StandardModels> = {
  openrouter: {
    summary: "google/gemini-2.5-flash-lite",
    nano: "google/gemini-2.5-flash-lite",
    low: "google/gemini-2.5-flash-lite",
    medium: "openai/gpt-4.1-mini",
    high: "openai/gpt-4.1",
    default: "openai/gpt-4.1-nano",
    fitness: "openai/gpt-4.1-mini",
    reasoning: "openai/gpt-4.1-mini",
    fallback: "switchpoint/router",
  },
  groq: {
    summary: "openai/gpt-oss-20b",
    nano: "openai/gpt-oss-20b",
    low: "openai/gpt-oss-20b",
    medium: "openai/gpt-oss-20b",
    high: "openai/gpt-oss-20b",
    default: "openai/gpt-oss-20b",
    fitness: "openai/gpt-oss-20b",
    reasoning: "openai/gpt-oss-20b",
    fallback: "openai/gpt-oss-20b",
  },
  openai: {
    summary: "gpt-4.1-nano",
    nano: "gpt-4.1-nano",
    low: "gpt-4.1-mini",
    medium: "gpt-4.1-mini",
    high: "gpt-4.1-mini",
    default: "gpt-4.1-mini",
    fitness: "gpt-4.1-mini",
    reasoning: "gpt-4.1-mini",
    fallback: "gpt-4.1-mini",
  },
}

// model runtime configuration
export const MODEL_CONFIG = {
  provider: "openai" as const satisfies LuckyProvider,
  inactive: [
    "moonshotai/kimi-k2",
    // "deepseek/deepseek-r1-0528:free", // timeouts
    // "anthropic/claude-sonnet-4",
    "x-ai/grok-4",
    "qwen/qwq-32b:free",
    // "moonshotai/kimi-k2-instruct",
    // "google/gemini-2.5-pro-preview",
    // "openai/gpt-4.1",
    // "openai/gpt-4.1-mini",
  ] as string[],
  defaults: DEFAULT_MODELS.openai,
} as const

export const getDefaultModels = (): StandardModels => {
  const provider = MODEL_CONFIG.provider
  return DEFAULT_MODELS[provider]
}

/**
 * Returns the cheapest active model id for the current provider, preferring
 * the lowest input-token price. Falls back to the configured summary model.
 */
export const getCheapestActiveModelId = (): ModelName => {
  const provider = MODEL_CONFIG.provider
  const models = providersV2[provider]
  const inactive = MODEL_CONFIG.inactive

  let cheapestId = DEFAULT_MODELS[provider].summary as ModelName
  let lowestInput = Number.POSITIVE_INFINITY

  for (const [modelId, pricing] of Object.entries(models)) {
    if (!pricing?.active) continue
    if (inactive.includes(modelId)) continue
    const inputPrice = typeof pricing.input === "number" ? pricing.input : Number.POSITIVE_INFINITY
    if (inputPrice < lowestInput) {
      lowestInput = inputPrice
      cheapestId = modelId as ModelName
    }
  }

  return cheapestId
}

/**
 * Helper to get model from catalog accounting for provider-specific key formats.
 * OpenAI provider uses unprefixed keys (e.g., "gpt-4o"), others use prefixed (e.g., "openai/gpt-4o").
 */
function getModel(modelId: string) {
  const provider = MODEL_CONFIG.provider
  const catalog = providersV2[provider]

  // For openai provider, strip the provider prefix if present
  if (provider === "openai" && modelId.includes("/")) {
    const unprefixed = modelId.split("/")[1]
    return catalog[unprefixed]
  }

  // For other providers (openrouter, groq), use the full prefixed id
  return catalog[modelId]
}

export const experimentalModels = {
  gpt35turbo: getModel("openai/gpt-3.5-turbo"),
  gpt41: getModel("openai/gpt-4.1"),
  gpt41mini: getModel("openai/gpt-4.1-mini"),
  gpt41nano: getModel("openai/gpt-4.1-nano"),
  gpt4o: getModel("openai/gpt-4o"),
  gpt4oMini: getModel("openai/gpt-4o-mini"),
  mistral: getModel("mistralai/mistral-small-3.2-24b-instruct"),
  gemini25pro: getModel("google/gemini-2.5-pro-preview"),
  geminiLite: getModel("google/gemini-2.5-flash-lite"),
  claude35haiku: getModel("anthropic/claude-3-5-haiku"),
  claudesonnet4: getModel("anthropic/claude-sonnet-4"),
  moonshotKimiK2Instruct: getModel("moonshotai/kimi-k2-instruct"),
  llama318bInstruct: getModel("meta-llama/llama-3.1-8b-instruct"),
  gpt5: getModel("openai/gpt-5"),
}
