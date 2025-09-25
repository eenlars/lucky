import { beforeEach, describe, expect, it } from "vitest"

// This test exercises sendAI text calls across providers by mocking
// the runtime provider per test case. It performs three lightweight
// text generations using the provider's default models.

type Provider = "openrouter" | "groq" | "openai"

const providers: Provider[] = ["openrouter", "groq", "openai"]

// Simple prompts to exercise text generation
const prompts = [
  "Reply with a single short sentence about testing.",
  "State the current year in digits only.",
  "Respond with the word: ok",
]

beforeEach(() => {
  // Ensure fresh module graph for provider mocking
  vi.resetModules()
})

describe("sendAI provider smoke", () => {
  it.each(providers)(
    "%s: three text generations across default models",
    async (provider) => {
      // Mock the runtime provider before importing sendAI
      vi.doMock("@runtime/settings/models", async () => {
        const real = await vi.importActual<any>("@runtime/settings/models")
        return {
          ...real,
          MODEL_CONFIG: { ...real.MODEL_CONFIG, provider },
          getDefaultModels: () => real.DEFAULT_MODELS[provider],
        }
      })

      const { sendAI } = await import("@core/messages/api/sendAI/sendAI")
      const { getDefaultModels } = await import("@runtime/settings/models")

      const models = getDefaultModels()
      const modelIds: string[] = [String(models.summary), String(models.default), String(models.reasoning)]

      for (let i = 0; i < modelIds.length; i++) {
        const model = modelIds[i]
        const prompt = prompts[i % prompts.length]

        const res = await sendAI({
          mode: "text",
          model: model as any,
          messages: [{ role: "user", content: prompt }],
          retries: 1,
          opts: { reasoning: i === 2 },
        })

        // Log minimal context when things go wrong for quick triage
        if (!res.success) {
          // eslint-disable-next-line no-console
          console.error(`sendAI failure provider=${provider} model=${model}:`, res.error, res.debug_output ?? "")
        }

        expect(res.success).toBe(true)
        expect(res.data?.text).toBeTypeOf("string")
        expect(res.data?.text?.trim().length).toBeGreaterThan(0)
      }
    },
    90_000
  )
})
