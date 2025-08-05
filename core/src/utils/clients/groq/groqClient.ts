import { createGroq } from "@ai-sdk/groq"

export const groqProvider = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})
