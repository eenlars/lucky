import { beforeEach, describe, expect, it } from "vitest"
import dotenv from "dotenv"
import path from "path"

// Load env from repo root to support local runs without global integration setup
const repoRoot = path.resolve(__dirname, "../../../../..")
dotenv.config({ path: path.join(repoRoot, ".env") })
dotenv.config({ path: path.join(repoRoot, ".env.local") })

type Provider = "openrouter" | "groq" | "openai"

// Determine which providers to test based on available API keys
const providerKey: Record<Provider, string> = {
  openrouter: process.env.OPENROUTER_API_KEY ?? "",
  groq: process.env.GROQ_API_KEY ?? "",
  openai: process.env.OPENAI_API_KEY ?? "",
}

// Only treat keys as available if they look real (not placeholders)
const isRealKey = (key: string) => Boolean(key && !key.trim().toLowerCase().startsWith("test-"))

const availableProviders = (Object.keys(providerKey) as Provider[]).filter((p) => isRealKey(providerKey[p]))

// Minimal prompts
const prompts = ["Reply with one short sentence about testing.", "Respond with the word: ok", "State the number 42"]

beforeEach(() => {
  vi.resetModules()
})

describe.skipIf(availableProviders.length === 0)("sendAI provider smoke (.integration.test)", () => {
  it.each(availableProviders)(
    "%s: three text generations",
    async (provider) => {
      // Mock runtime provider before importing sendAI
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

      for (let i = 0; i < 3; i++) {
        const model = modelIds[i]
        const prompt = prompts[i]
        const res = await sendAI({
          mode: "text",
          model: model as any,
          messages: [{ role: "user", content: prompt }],
          retries: 1,
          opts: { reasoning: i === 2 },
        })

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
