import type { Provider } from "./models"

// Change this literal to switch providers - TypeScript will instantly re-type-check MODELS
export const CURRENT_PROVIDER = "openrouter" as const satisfies Provider
