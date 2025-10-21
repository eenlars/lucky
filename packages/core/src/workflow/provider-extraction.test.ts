import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { describe, expect, it } from "vitest"
import { extractRequiredGateways, getProviderKeyName } from "./provider-extraction"

describe("extractRequiredGateways", () => {
  it("should extract single provider from catalog", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "agent1",
          description: "test",
          systemPrompt: "test",
          gatewayModelId: "gpt-4.1-nano",
          gateway: "openai-api",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      entryNodeId: "agent1",
    }
    const result = extractRequiredGateways(config)
    expect(result.gateways).toEqual(new Set(["openai-api"]))
    expect(result.models.get("openai-api")).toEqual(["gpt-4.1-nano"])
  })

  it("should extract multiple providers from catalog", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "agent1",
          description: "test",
          systemPrompt: "test",
          gatewayModelId: "gpt-4.1-nano",
          gateway: "openai-api",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
        {
          nodeId: "agent2",
          description: "test",
          systemPrompt: "test",
          gatewayModelId: "anthropic/claude-sonnet-4",
          gateway: "openrouter-api",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      entryNodeId: "agent1",
    }
    const result = extractRequiredGateways(config)
    // anthropic/claude-sonnet-4 uses openrouter provider!
    expect(result.gateways).toEqual(new Set(["openai-api", "openrouter-api"]))
    expect(result.models.get("openai-api")).toEqual(["gpt-4.1-nano"])
    expect(result.models.get("openrouter-api")).toEqual(["anthropic/claude-sonnet-4"])
  })

  it("should handle model not in catalog", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "agent1",
          description: "test",
          systemPrompt: "test",
          gatewayModelId: "unknown/model",
          gateway: "openai-api",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      entryNodeId: "agent1",
    }
    const result = extractRequiredGateways(config)
    expect(result.gateways.size).toBe(0)
  })

  it("should handle nodes without gatewayModelId", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "agent1",
          description: "test",
          systemPrompt: "test",
          gatewayModelId: "",
          gateway: "openai-api",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      entryNodeId: "agent1",
    }
    const result = extractRequiredGateways(config)
    expect(result.gateways.size).toBe(0)
  })

  it("should track multiple models from same provider", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "agent1",
          description: "test",
          systemPrompt: "test",
          gatewayModelId: "gpt-4.1-nano",
          gateway: "openai-api",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
        {
          nodeId: "agent2",
          description: "test",
          systemPrompt: "test",
          gatewayModelId: "gpt-4.1-mini",
          gateway: "openai-api",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      entryNodeId: "agent1",
    }
    const result = extractRequiredGateways(config)
    expect(result.gateways).toEqual(new Set(["openai-api"]))
    expect(result.models.get("openai-api")).toEqual(["gpt-4.1-nano", "gpt-4.1-mini"])
  })

  it("should correctly identify groq provider for groq models", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "agent1",
          description: "test",
          systemPrompt: "test",
          gatewayModelId: "openai/gpt-oss-20b",
          gateway: "openai-api",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      entryNodeId: "agent1",
    }
    const result = extractRequiredGateways(config)
    // openai/gpt-oss-20b actually uses groq provider!
    expect(result.gateways).toEqual(new Set(["groq-api"]))
    expect(result.models.get("groq-api")).toEqual(["openai/gpt-oss-20b"])
  })

  it("should handle empty nodes array", () => {
    const config: WorkflowConfig = {
      nodes: [],
      entryNodeId: "agent1",
    }
    const result = extractRequiredGateways(config)
    expect(result.gateways.size).toBe(0)
    expect(result.models.size).toBe(0)
  })
})

describe("getProviderKeyName", () => {
  it("should map known providers", () => {
    expect(getProviderKeyName("openai")).toBe("OPENAI_API_KEY")
    expect(getProviderKeyName("openrouter")).toBe("OPENROUTER_API_KEY")
    expect(getProviderKeyName("anthropic")).toBe("ANTHROPIC_API_KEY")
    expect(getProviderKeyName("groq")).toBe("GROQ_API_KEY")
  })

  it("should generate key name for unknown providers", () => {
    expect(getProviderKeyName("custom")).toBe("CUSTOM_API_KEY")
  })

  it("should handle case consistently", () => {
    expect(getProviderKeyName("OpenAI")).toBe("OPENAI_API_KEY")
    expect(getProviderKeyName("GROQ")).toBe("GROQ_API_KEY")
  })
})
