import type { StandardModels } from "@lucky/shared/contracts/llm-contracts/models-old"
import type { LuckyGateway } from "@lucky/shared/contracts/llm-contracts/providers"

/* ---------- DEFAULT MODELS ---------- */
export const DEFAULT_MODELS = {
  "openrouter-api": {
    summary: "google/gemini-2.5-flash-lite",
    nano: "google/gemini-2.5-flash-lite",
    low: "google/gemini-2.5-flash-lite",
    balanced: "openai/gpt-4.1-mini",
    high: "openai/gpt-5-mini",
    default: "openai/gpt-4.1-nano",
    fitness: "openai/gpt-4.1-mini",
    reasoning: "openai/gpt-4.1-mini",
    fallback: "switchpoint/router",
  },
  "groq-api": {
    summary: "openai/gpt-oss-20b",
    nano: "openai/gpt-oss-20b",
    low: "openai/gpt-oss-20b",
    balanced: "openai/gpt-oss-20b",
    high: "openai/gpt-oss-20b",
    default: "openai/gpt-oss-20b",
    fitness: "openai/gpt-oss-20b",
    reasoning: "openai/gpt-oss-20b",
    fallback: "openai/gpt-oss-20b",
  },
  "openai-api": {
    summary: "gpt-5-nano",
    nano: "gpt-5-nano",
    low: "gpt-5-nano",
    balanced: "gpt-4o-mini",
    high: "gpt-5-nano",
    default: "gpt-4o-mini",
    fitness: "gpt-5-nano",
    reasoning: "gpt-5-nano",
    fallback: "gpt-5-nano",
  },
} satisfies Record<LuckyGateway, StandardModels>
