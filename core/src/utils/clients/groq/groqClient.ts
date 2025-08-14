import { createGroq } from "@ai-sdk/groq"
import { envi } from "@core/utils/env.mjs"

export const groqProvider = createGroq({
  apiKey: envi.GROQ_API_KEY ?? undefined,
})
