import type { WorkflowConfig } from "@lucky/shared/contracts/workflow"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  FALLBACK_PROVIDER_KEYS,
  formatMissingProviders,
  getRequiredProviderKeys,
  validateProviderKeys,
} from "../lib/provider-validation"

// Mock dependencies
vi.mock("@lucky/core/workflow/provider-extraction", () => ({
  extractRequiredProviders: vi.fn(),
  getProviderDisplayName: vi.fn((key: string) => {
    const displayNames: Record<string, string> = {
      OPENAI_API_KEY: "OpenAI",
      GROQ_API_KEY: "Groq",
      ANTHROPIC_API_KEY: "Anthropic",
      OPENROUTER_API_KEY: "OpenRouter",
    }
    return displayNames[key] || key
  }),
  getProviderKeyName: vi.fn((provider: string) => {
    const keyNames: Record<string, string> = {
      openai: "OPENAI_API_KEY",
      groq: "GROQ_API_KEY",
      anthropic: "ANTHROPIC_API_KEY",
      openrouter: "OPENROUTER_API_KEY",
    }
    return keyNames[provider] || `${provider.toUpperCase()}_API_KEY`
  }),
}))

vi.mock("@/lib/error-logger", () => ({
  logException: vi.fn(),
}))

describe("getRequiredProviderKeys", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should extract providers and models from workflow config", async () => {
    const { extractRequiredProviders } = await import("@lucky/core/workflow/provider-extraction")

    const mockConfig: WorkflowConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          modelName: "openai#gpt-4o",
          description: "Test node",
          mcpTools: [],
          codeTools: [],
          systemPrompt: "test",
          handOffs: [],
          memory: {},
        },
      ],
    }

    vi.mocked(extractRequiredProviders).mockReturnValue({
      providers: new Set(["openai"]),
      models: new Map([["openai", ["gpt-4o"]]]),
    })

    const result = getRequiredProviderKeys(mockConfig, "test-context")

    expect(result.providers).toEqual(new Set(["openai"]))
    expect(result.models).toEqual(new Map([["openai", ["gpt-4o"]]]))
  })

  it("should return fallback providers on extraction error", async () => {
    const { extractRequiredProviders } = await import("@lucky/core/workflow/provider-extraction")
    const { logException } = await import("@/lib/error-logger")

    const mockConfig: WorkflowConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
    }

    vi.mocked(extractRequiredProviders).mockImplementation(() => {
      throw new Error("Extraction failed")
    })

    const result = getRequiredProviderKeys(mockConfig, "test-context")

    expect(result.providers).toEqual(new Set(FALLBACK_PROVIDER_KEYS))
    expect(result.models).toEqual(new Map())
    expect(logException).toHaveBeenCalled()
  })

  it("should handle multiple providers", async () => {
    const { extractRequiredProviders } = await import("@lucky/core/workflow/provider-extraction")

    const mockConfig: WorkflowConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
    }

    vi.mocked(extractRequiredProviders).mockReturnValue({
      providers: new Set(["openai", "groq", "anthropic"]),
      models: new Map([
        ["openai", ["gpt-4o"]],
        ["groq", ["llama-3.1-8b"]],
        ["anthropic", ["claude-3-opus"]],
      ]),
    })

    const result = getRequiredProviderKeys(mockConfig, "test-context")

    expect(result.providers.size).toBe(3)
    expect(result.providers.has("openai")).toBe(true)
    expect(result.providers.has("groq")).toBe(true)
    expect(result.providers.has("anthropic")).toBe(true)
  })
})

describe("validateProviderKeys", () => {
  it("should return empty array when all keys are present", () => {
    const requiredKeys = ["OPENAI_API_KEY", "GROQ_API_KEY"]
    const apiKeys = {
      OPENAI_API_KEY: "sk-xxx",
      GROQ_API_KEY: "gsk-xxx",
    }

    const missing = validateProviderKeys(requiredKeys, apiKeys)

    expect(missing).toEqual([])
  })

  it("should return missing keys", () => {
    const requiredKeys = ["OPENAI_API_KEY", "GROQ_API_KEY", "ANTHROPIC_API_KEY"]
    const apiKeys = {
      OPENAI_API_KEY: "sk-xxx",
    }

    const missing = validateProviderKeys(requiredKeys, apiKeys)

    expect(missing).toEqual(["GROQ_API_KEY", "ANTHROPIC_API_KEY"])
  })

  it("should treat undefined values as missing", () => {
    const requiredKeys = ["OPENAI_API_KEY", "GROQ_API_KEY"]
    const apiKeys = {
      OPENAI_API_KEY: "sk-xxx",
      GROQ_API_KEY: undefined,
    }

    const missing = validateProviderKeys(requiredKeys, apiKeys)

    expect(missing).toEqual(["GROQ_API_KEY"])
  })

  it("should handle empty required keys array", () => {
    const requiredKeys: string[] = []
    const apiKeys = {
      OPENAI_API_KEY: "sk-xxx",
    }

    const missing = validateProviderKeys(requiredKeys, apiKeys)

    expect(missing).toEqual([])
  })

  it("should handle empty apiKeys object", () => {
    const requiredKeys = ["OPENAI_API_KEY", "GROQ_API_KEY"]
    const apiKeys = {}

    const missing = validateProviderKeys(requiredKeys, apiKeys)

    expect(missing).toEqual(["OPENAI_API_KEY", "GROQ_API_KEY"])
  })

  it("should treat empty string as missing", () => {
    const requiredKeys = ["OPENAI_API_KEY"]
    const apiKeys = {
      OPENAI_API_KEY: "",
    }

    const missing = validateProviderKeys(requiredKeys, apiKeys)

    expect(missing).toEqual(["OPENAI_API_KEY"])
  })

  it("should accept non-empty string values", () => {
    const requiredKeys = ["OPENAI_API_KEY"]
    const apiKeys = {
      OPENAI_API_KEY: "sk-valid-key",
    }

    const missing = validateProviderKeys(requiredKeys, apiKeys)

    expect(missing).toEqual([])
  })
})

describe("formatMissingProviders", () => {
  it("should convert API key names to display names", async () => {
    const missingKeys = ["OPENAI_API_KEY", "GROQ_API_KEY"]

    const displayNames = formatMissingProviders(missingKeys)

    expect(displayNames).toEqual(["OpenAI", "Groq"])
  })

  it("should handle single missing key", async () => {
    const missingKeys = ["ANTHROPIC_API_KEY"]

    const displayNames = formatMissingProviders(missingKeys)

    expect(displayNames).toEqual(["Anthropic"])
  })

  it("should handle empty array", async () => {
    const missingKeys: string[] = []

    const displayNames = formatMissingProviders(missingKeys)

    expect(displayNames).toEqual([])
  })

  it("should handle multiple different providers", async () => {
    const missingKeys = ["OPENAI_API_KEY", "GROQ_API_KEY", "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY"]

    const displayNames = formatMissingProviders(missingKeys)

    expect(displayNames).toEqual(["OpenAI", "Groq", "Anthropic", "OpenRouter"])
  })

  it("should preserve order of missing keys", async () => {
    const missingKeys = ["GROQ_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"]

    const displayNames = formatMissingProviders(missingKeys)

    expect(displayNames).toEqual(["Groq", "OpenAI", "Anthropic"])
  })
})

describe("FALLBACK_PROVIDER_KEYS", () => {
  it("should export fallback provider keys from @lucky/models", async () => {
    expect(FALLBACK_PROVIDER_KEYS).toBeDefined()
    expect(Array.isArray(FALLBACK_PROVIDER_KEYS)).toBe(true)
  })
})
