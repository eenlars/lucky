import { describe, expect, it } from "vitest"
import { PROVIDERS } from "../llm-catalog/providers"
import { getProviderDisplayName, getProviderKeyName } from "../provider-utils"

describe("PROVIDERS integration", () => {
  it("should have all required fields", () => {
    for (const provider of PROVIDERS) {
      expect(provider.provider).toBeDefined()
      expect(provider.displayName).toBeDefined()
      expect(provider.apiKeyName).toBeDefined()
      expect(provider.apiKeyPrefix).toBeDefined()
    }
  })

  it("should contain OpenAI, OpenRouter, and Groq", () => {
    const providerNames = PROVIDERS.map(p => p.provider)
    expect(providerNames).toContain("openai")
    expect(providerNames).toContain("openrouter")
    expect(providerNames).toContain("groq")
  })

  it("getProviderKeyName should use PROVIDERS data", () => {
    expect(getProviderKeyName("openai")).toBe("OPENAI_API_KEY")
    expect(getProviderKeyName("openrouter")).toBe("OPENROUTER_API_KEY")
    expect(getProviderKeyName("groq")).toBe("GROQ_API_KEY")
  })

  it("getProviderDisplayName should use PROVIDERS data", () => {
    expect(getProviderDisplayName("OPENAI_API_KEY")).toBe("OpenAI")
    expect(getProviderDisplayName("OPENROUTER_API_KEY")).toBe("OpenRouter")
    expect(getProviderDisplayName("GROQ_API_KEY")).toBe("Groq")
  })

  it("should have correct API key prefixes", () => {
    const openai = PROVIDERS.find(p => p.provider === "openai")
    const openrouter = PROVIDERS.find(p => p.provider === "openrouter")
    const groq = PROVIDERS.find(p => p.provider === "groq")

    expect(openai?.apiKeyPrefix).toBe("sk-")
    expect(openrouter?.apiKeyPrefix).toBe("sk-or-v1-")
    expect(groq?.apiKeyPrefix).toBe("gsk_")
  })

  it("should fallback for unknown providers", () => {
    expect(getProviderKeyName("unknown")).toBe("UNKNOWN_API_KEY")
    expect(getProviderDisplayName("UNKNOWN_API_KEY")).toBe("Unknown")
  })

  it("should handle Anthropic (legacy provider not in PROVIDERS)", () => {
    expect(getProviderDisplayName("ANTHROPIC_API_KEY")).toBe("Anthropic")
  })
})
