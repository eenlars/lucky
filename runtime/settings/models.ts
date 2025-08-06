import type { AllowedModelName } from "@core/utils/spending/models.types"
import type { LuckyProvider } from "@core/utils/spending/provider"

/* ---------- PRICING TYPES ---------- */
export type ModelPricing = {
  input: number
  "cached-input": number | null
  output: number
  info: `IQ:${number}/10;speed:${"fast" | "medium" | "slow"};pricing:${
    | "low"
    | "medium"
    | "high"};`
  context_length: number
} // per 1M tokens

export const pricingOLD = {
  "openai/gpt-4.1-nano": {
    input: 0.1,
    "cached-input": 0.025,
    output: 0.4,
    info: "IQ:6/10;speed:fast;pricing:low;",
    context_length: 1047576,
  },
  "openai/gpt-4.1-mini": {
    input: 0.4,
    "cached-input": 0.1,
    output: 1.6,
    info: "IQ:7/10;speed:fast;pricing:medium;",
    context_length: 1047576,
  },
  "google/gemini-2.5-flash-lite": {
    input: 0.15,
    "cached-input": 0.06,
    output: 0.6,
    info: "IQ:5/10;speed:fast;pricing:low;",
    context_length: 1048576,
  },
  "switchpoint/router": {
    input: 0.85,
    "cached-input": 0.283333,
    output: 3.4,
    context_length: 131072,
    info: "IQ:8/10;speed:medium;pricing:medium;",
  },
  "google/gemini-2.5-pro-preview": {
    input: 1.25,
    "cached-input": 0.416667,
    output: 10,
    info: "IQ:7/10;speed:medium;pricing:medium;",
    context_length: 1048576,
  },
  "anthropic/claude-sonnet-4": {
    input: 3,
    "cached-input": 1.166667,
    output: 15,
    info: "IQ:8/10;speed:medium;pricing:medium;",
    context_length: 1047576,
  },
  "openai/gpt-4o-search-preview": {
    input: 2.5,
    "cached-input": 0.833333,
    output: 10,
    info: "IQ:8/10;speed:medium;pricing:medium;",
    context_length: 128000,
  },
} satisfies Record<string, ModelPricing>

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

export type ModelName = AllowedModelName<typeof MODEL_CONFIG.provider>

// Re-export pricing for backward compatibility  
export { pricingOLD as pricing }
