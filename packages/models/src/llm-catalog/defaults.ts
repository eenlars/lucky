import type { StandardModels } from "@lucky/shared/contracts/llm-contracts/models-old"
import type { LuckyProvider } from "@lucky/shared/contracts/llm-contracts/providers"

/* ---------- DEFAULT MODELS ---------- */
export const DEFAULT_MODELS = {
  openrouter: {
    summary: "openrouter#google/gemini-2.5-flash-lite",
    nano: "openrouter#google/gemini-2.5-flash-lite",
    low: "openrouter#google/gemini-2.5-flash-lite",
    balanced: "openrouter#openai/gpt-4.1-mini",
    high: "openrouter#openai/gpt-4.1",
    default: "openrouter#openai/gpt-4.1-nano",
    fitness: "openrouter#openai/gpt-4.1-mini",
    reasoning: "openrouter#openai/gpt-4.1-mini",
    fallback: "switchpoint/router",
  },
  groq: {
    summary: "groq#openai/gpt-oss-20b",
    nano: "groq#openai/gpt-oss-20b",
    low: "groq#openai/gpt-oss-20b",
    balanced: "groq#openai/gpt-oss-20b",
    high: "groq#openai/gpt-oss-20b",
    default: "groq#openai/gpt-oss-20b",
    fitness: "groq#openai/gpt-oss-20b",
    reasoning: "groq#openai/gpt-oss-20b",
    fallback: "groq#openai/gpt-oss-20b",
  },
  openai: {
    summary: "openai#gpt-5-nano",
    nano: "openai#gpt-5-nano",
    low: "openai#gpt-5-nano",
    balanced: "openai#gpt-4o-mini",
    high: "openai#gpt-5-nano",
    default: "openai#gpt-4o-mini",
    fitness: "openai#gpt-5-nano",
    reasoning: "openai#gpt-5-nano",
    fallback: "openai#gpt-5-nano",
  },
} satisfies Record<LuckyProvider, StandardModels>
