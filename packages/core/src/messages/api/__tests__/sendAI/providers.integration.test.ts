import path from "node:path"
import dotenv from "dotenv"
import { describe, it } from "vitest"

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

const _availableProviders = (Object.keys(providerKey) as Provider[]).filter(p => isRealKey(providerKey[p]))

// Minimal prompts
const _prompts = ["Reply with one short sentence about testing.", "Respond with the word: ok", "State the number 42"]

// NOTE: The codebase now uses a single active provider from configuration (getCurrentGateway()).
// The legacy per-request provider parameter is no longer supported.
// TODO: Rewrite this suite to validate behavior for the configured provider only,
//       gated by the presence of a real API key, or move to an e2e/integration-only lane.
describe.skip("sendAI provider smoke (.integration.test)", () => {
  it("groq: three text generations (obsolete multi-provider test)", () => {
    // intentionally skipped - see TODO above
  })
})
