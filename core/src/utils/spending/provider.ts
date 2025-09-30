import { MODEL_CONFIG } from "@core/core-config/compat"

export type LuckyProvider = "openai" | "openrouter" | "groq"

// Change this literal to switch providers - TypeScript will instantly re-type-check MODELS
export const CURRENT_PROVIDER = MODEL_CONFIG.provider satisfies LuckyProvider
