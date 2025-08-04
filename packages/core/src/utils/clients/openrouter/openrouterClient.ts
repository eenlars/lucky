import { envi } from "@/env.mjs"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

const openrouter = createOpenRouter({
  apiKey: envi.OPENROUTER_API_KEY || undefined,
})

export { openrouter }
