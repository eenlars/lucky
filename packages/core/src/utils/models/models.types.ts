// DO NOT CHANGE ANYTHING IN THIS FILE OR ANY TYPE WITHOUT CONSENT
/* ---------- PRICING TYPES ---------- */
export type ModelPricing = {
  input: number
  "cached-input": number | null
  output: number
  info: `IQ:${number}/10;speed:${"fast" | "medium" | "slow"};pricing:${"low" | "medium" | "high"};`
  context_length: number
  active: boolean
} // per 1M tokens

export type LuckyProvider = "openai" | "openrouter" | "groq"
export type Provider = LuckyProvider

/* ───────── TYPE-SAFE MODEL SELECTION ───────── */

// Keep only "active: true" model keys as strings
export type ActiveKeys<T extends Record<string, { active: boolean }>> = Extract<
  {
    [K in keyof T]: T[K]["active"] extends true ? K : never
  }[keyof T],
  string
>

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cachedInputTokens?: number
}
