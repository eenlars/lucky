import { providersV2 } from "@core/utils/spending/modelInfo"
import type {
  AllowedModelName,
  ModelPricingV2,
  StandardModels,
} from "@core/utils/spending/models.types"
import type { LuckyProvider } from "@core/utils/spending/provider"

// model runtime configuration
export const MODEL_CONFIG = {
  provider: "openrouter" as const satisfies LuckyProvider,
  inactive: new Set<string>([
    "moonshotai/kimi-k2",
    // "deepseek/deepseek-r1-0528:free", // timeouts
    // "anthropic/claude-sonnet-4",
    "x-ai/grok-4",
    "qwen/qwq-32b:free",
    // "moonshotai/kimi-k2-instruct",
    // "google/gemini-2.5-pro-preview",
    // "openai/gpt-4.1",
    // "openai/gpt-4.1-mini",
  ]),
} as const

/* ---------- DEFAULT MODELS ---------- */
export const DEFAULT_MODELS = {
  openrouter: {
    summary: "google/gemini-2.5-flash-lite",
    nano: "google/gemini-2.5-flash-lite",
    low: "google/gemini-2.5-flash-lite",
    medium: "google/gemini-2.5-pro-preview",
    high: "google/gemini-2.5-pro-preview",
    default: "google/gemini-2.5-flash-lite",
    fitness: "google/gemini-2.5-pro-preview",
    reasoning: "anthropic/claude-sonnet-4",
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
    nano: "gpt-4.1-mini",
    low: "gpt-4.1-mini",
    medium: "gpt-4.1-mini",
    high: "gpt-4.1-mini",
    default: "gpt-4.1-mini",
    fitness: "gpt-4.1-mini",
    reasoning: "gpt-4.1-mini",
    fallback: "gpt-4.1-mini",
  },
} satisfies {
  [T in LuckyProvider]: StandardModels<T, "any">
}

type DEFAULT_MODELS_BY_CURRENT_PROVIDER =
  (typeof DEFAULT_MODELS)[typeof MODEL_CONFIG.provider]

export const getDefaultModels = (): DEFAULT_MODELS_BY_CURRENT_PROVIDER => {
  const provider = MODEL_CONFIG.provider
  return DEFAULT_MODELS[provider]
}

export const getActiveModelNames = (): AllowedModelName<
  typeof MODEL_CONFIG.provider
>[] => {
  const provider = MODEL_CONFIG.provider
  return Object.keys(DEFAULT_MODELS[provider]) as AllowedModelName<
    typeof MODEL_CONFIG.provider
  >[]
}

export const experimentalModels = {
  gpt41: providersV2[MODEL_CONFIG.provider]["openai/gpt-4.1"],
  gpt41mini: providersV2[MODEL_CONFIG.provider]["openai/gpt-4.1-mini"],
  gpt41nano: providersV2[MODEL_CONFIG.provider]["openai/gpt-4.1-nano"],
  gpt4o: providersV2[MODEL_CONFIG.provider]["openai/gpt-4o"],
  gpt4oMini: providersV2[MODEL_CONFIG.provider]["openai/gpt-4o-mini"],
  mistral:
    providersV2[MODEL_CONFIG.provider][
      "mistralai/mistral-small-3.2-24b-instruct"
    ],
  gemini25pro:
    providersV2[MODEL_CONFIG.provider]["google/gemini-2.5-pro-preview"],
  claude35haiku:
    providersV2[MODEL_CONFIG.provider]["anthropic/claude-3-5-haiku"],
  claudesonnet4:
    providersV2[MODEL_CONFIG.provider]["anthropic/claude-sonnet-4"],
} as const satisfies Record<string, ModelPricingV2>
