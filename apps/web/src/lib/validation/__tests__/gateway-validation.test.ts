import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  GATEWAY_API_KEYS,
  formatGatewayDisplayNames,
  getRequiredGateways,
  validateGatewayKeys,
} from "../gateway-validation"

// Mock dependencies
vi.mock("@lucky/core/workflow/provider-extraction", () => ({
  extractRequiredGateways: vi.fn(),
  getProviderDisplayName: vi.fn((key: string) => {
    const displayNames: Record<string, string> = {
      OPENAI_API_KEY: "OpenAI",
      GROQ_API_KEY: "Groq",
      ANTHROPIC_API_KEY: "Anthropic",
      OPENROUTER_API_KEY: "OpenRouter",
    }
    return displayNames[key] || key
  }),
  getProviderKeyName: vi.fn((gateway: string) => {
    const keyNames: Record<string, string> = {
      "openai-api": "OPENAI_API_KEY",
      "groq-api": "GROQ_API_KEY",
      "anthropic-api": "ANTHROPIC_API_KEY",
      "openrouter-api": "OPENROUTER_API_KEY",
    }
    return keyNames[gateway] || `${gateway.toUpperCase().replace(/-/g, "_")}_API_KEY`
  }),
}))

vi.mock("@/lib/error-logger", () => ({
  logException: vi.fn(),
}))

describe("getRequiredGateways", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it("should extract gateways and models from workflow config", async () => {
    const { extractRequiredGateways } = await import("@lucky/core/workflow/provider-extraction")

    const mockConfig: WorkflowConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          gatewayModelId: "gpt-4o",
          gateway: "openai-api",
          description: "Test node",
          mcpTools: [],
          codeTools: [],
          systemPrompt: "test",
          handOffs: [],
          memory: {},
        },
      ],
    }

    vi.mocked(extractRequiredGateways).mockReturnValue({
      gateways: new Set(["openai-api"]),
      models: new Map([["openai-api", ["gpt-4o"]]]),
    })

    const result = getRequiredGateways(mockConfig, "test-context")

    expect(result.gateways).toEqual(new Set(["openai-api"]))
    expect(result.models).toEqual(new Map([["openai-api", ["gpt-4o"]]]))
  })

  it("should return fallback gateways on extraction error", async () => {
    const { extractRequiredGateways } = await import("@lucky/core/workflow/provider-extraction")
    const { logException } = await import("@/lib/error-logger")
    const { GATEWAYS } = await import("@lucky/models")

    const mockConfig: WorkflowConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
    }

    vi.mocked(extractRequiredGateways).mockImplementation(() => {
      throw new Error("Extraction failed")
    })

    const result = getRequiredGateways(mockConfig, "test-context")

    const expectedGateways = new Set([...GATEWAYS.map((g: { gateway: string }) => g.gateway)])
    expect(result.gateways).toEqual(expectedGateways)
    expect(result.models).toEqual(new Map())
    expect(logException).toHaveBeenCalled()
  })

  it("should handle multiple gateways", async () => {
    const { extractRequiredGateways } = await import("@lucky/core/workflow/provider-extraction")

    const mockConfig: WorkflowConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
    }
    vi.mocked(extractRequiredGateways).mockReturnValue({
      gateways: new Set(["openai-api", "groq-api", "openrouter-api"]),
      models: new Map([
        ["openai-api", ["gpt-4o"]],
        ["groq-api", ["llama-3.1-8b"]],
        ["openrouter-api", ["claude-3-opus"]],
      ]),
    })

    const result = getRequiredGateways(mockConfig, "test-context")

    expect(result.gateways.size).toBe(3)
    expect(result.gateways.has("openai-api")).toBe(true)
    expect(result.gateways.has("groq-api")).toBe(true)
    expect(result.gateways.has("openrouter-api")).toBe(true)
  })
})

describe("validateGatewayKeys", () => {
  it("should return empty array when all gateway keys are present", () => {
    const requiredGateways = ["openai-api", "groq-api"]
    const gatewayKeys = {
      "openai-api": "sk-xxx",
      "groq-api": "gsk-xxx",
    }

    const missing = validateGatewayKeys(requiredGateways, gatewayKeys)

    expect(missing).toEqual([])
  })

  it("should return missing gateway names", () => {
    const requiredGateways = ["openai-api", "groq-api", "openrouter-api"]
    const gatewayKeys = {
      "openai-api": "sk-xxx",
    }

    const missing = validateGatewayKeys(requiredGateways, gatewayKeys)

    expect(missing).toEqual(["groq-api", "openrouter-api"])
  })

  it("should treat undefined values as missing", () => {
    const requiredGateways = ["openai-api", "groq-api"]
    const gatewayKeys = {
      "openai-api": "sk-xxx",
      "groq-api": undefined,
    }

    const missing = validateGatewayKeys(requiredGateways, gatewayKeys)

    expect(missing).toEqual(["groq-api"])
  })

  it("should handle empty required gateways array", () => {
    const requiredGateways: string[] = []
    const gatewayKeys = {
      "openai-api": "sk-xxx",
    }

    const missing = validateGatewayKeys(requiredGateways, gatewayKeys)

    expect(missing).toEqual([])
  })

  it("should handle empty gatewayKeys object", () => {
    const requiredGateways = ["openai-api", "groq-api"]
    const gatewayKeys = {}

    const missing = validateGatewayKeys(requiredGateways, gatewayKeys)

    expect(missing).toEqual(["openai-api", "groq-api"])
  })

  it("should treat empty string as missing", () => {
    const requiredGateways = ["openai-api"]
    const gatewayKeys = {
      "openai-api": "",
    }

    const missing = validateGatewayKeys(requiredGateways, gatewayKeys)

    expect(missing).toEqual(["openai-api"])
  })

  it("should accept non-empty string values", () => {
    const requiredGateways = ["openai-api"]
    const gatewayKeys = {
      "openai-api": "sk-valid-key",
    }

    const missing = validateGatewayKeys(requiredGateways, gatewayKeys)

    expect(missing).toEqual([])
  })
})

describe("formatGatewayDisplayNames", () => {
  it("should convert API key names to display names", async () => {
    const missingKeys = ["OPENAI_API_KEY", "GROQ_API_KEY"]

    const displayNames = formatGatewayDisplayNames(missingKeys)

    expect(displayNames).toEqual(["OpenAI", "Groq"])
  })

  it("should handle single missing key", async () => {
    const missingKeys = ["ANTHROPIC_API_KEY"]

    const displayNames = formatGatewayDisplayNames(missingKeys)

    expect(displayNames).toEqual(["Anthropic"])
  })

  it("should handle empty array", async () => {
    const missingKeys: string[] = []

    const displayNames = formatGatewayDisplayNames(missingKeys)

    expect(displayNames).toEqual([])
  })

  it("should handle multiple different gateways", async () => {
    const missingKeys = ["OPENAI_API_KEY", "GROQ_API_KEY", "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY"]

    const displayNames = formatGatewayDisplayNames(missingKeys)

    expect(displayNames).toEqual(["OpenAI", "Groq", "Anthropic", "OpenRouter"])
  })

  it("should preserve order of missing keys", async () => {
    const missingKeys = ["GROQ_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"]

    const displayNames = formatGatewayDisplayNames(missingKeys)

    expect(displayNames).toEqual(["Groq", "OpenAI", "Anthropic"])
  })
})

describe("GATEWAY_API_KEYS", () => {
  it("should export fallback gateway API keys from @lucky/models", async () => {
    expect(GATEWAY_API_KEYS).toBeDefined()
    expect(Array.isArray(GATEWAY_API_KEYS)).toBe(true)
  })
})
