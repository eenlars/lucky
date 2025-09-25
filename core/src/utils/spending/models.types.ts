// DO NOT CHANGE ANYTHING IN THIS FILE OR ANY TYPE WITHOUT CONSENT

import type { providersV2 } from "@core/utils/spending/modelInfo"
import type { CURRENT_PROVIDER, LuckyProvider } from "@core/utils/spending/provider"

/* ---------- PRICING TYPES ---------- */
export type ModelPricingV2 = {
  id: string
  input: number
  "cached-input": number | null
  output: number
  info: `IQ:${number}/10;speed:${"fast" | "medium" | "slow"};pricing:${"low" | "medium" | "high"};`
  context_length: number
  active: boolean
} // per 1M tokens

/* ───────── TYPE-SAFE MODEL SELECTION ───────── */

// Keep only "active: true" model keys as strings
export type ActiveKeys<T extends Record<string, { active: boolean }>> = Extract<
  {
    [K in keyof T]: T[K]["active"] extends true ? K : never
  }[keyof T],
  string
>

export type AnyModelName = {
  [P in LuckyProvider]: keyof (typeof providersV2)[P]
}[LuckyProvider]

type ModelNameV2<T extends LuckyProvider = typeof CURRENT_PROVIDER> = {
  [P in LuckyProvider]: keyof (typeof providersV2)[P]
}[T]

// DO NOT CHANGE THIS OR ANY TYPE WITHOUT CONSENT

// Only allow ACTIVE models from the current provider
export type AllowedModelName<T extends LuckyProvider = typeof CURRENT_PROVIDER> = ActiveKeys<(typeof providersV2)[T]>

export type ModelName = AllowedModelName<typeof CURRENT_PROVIDER>

export type OpenRouterModelName = AllowedModelName<"openrouter">

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cachedInputTokens?: number
}

// open or closed for other providers, depending on the provider
export type StandardModels<
  T extends LuckyProvider = typeof CURRENT_PROVIDER,
  M extends "any" | "onlyActive" = "any",
> = {
  summary: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
  nano: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
  low: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
  medium: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
  high: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
  default: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
  fitness: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
  reasoning: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
  fallback: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
}

export interface ModelPool {
  standardModels: StandardModels

  //active models, including their info
  activeModels: Record<LuckyProvider, Record<string, ModelPricingV2>>

  provider: LuckyProvider
}
// Create type-safe active model subset - ActiveModelName should be assignable to ModelName
export type ActiveModelName = AllowedModelName
