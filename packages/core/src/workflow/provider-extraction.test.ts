import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { describe, expect, it } from "vitest"
import { extractRequiredProviders, getProviderKeyName } from "./provider-extraction"

describe("extractRequiredProviders", () => {
  it("should extract single provider from catalog", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "agent1",
          description: "test",
          systemPrompt: "test",
          modelName: "gpt-4.1-nano",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      entryNodeId: "agent1",
    }
    const result = extractRequiredProviders(config)
    expect(result.providers).toEqual(new Set(["openai"]))
    expect(result.models.get("openai")).toEqual(["gpt-4.1-nano"])
  })

  it("should extract multiple providers from catalog", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "agent1",
          description: "test",
          systemPrompt: "test",
          modelName: "gpt-4.1-nano",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
        {
          nodeId: "agent2",
          description: "test",
          systemPrompt: "test",
          modelName: "anthropic/claude-sonnet-4",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      entryNodeId: "agent1",
    }
    const result = extractRequiredProviders(config)
    // anthropic/claude-sonnet-4 uses openrouter provider!
    expect(result.providers).toEqual(new Set(["openai", "openrouter"]))
    expect(result.models.get("openai")).toEqual(["gpt-4.1-nano"])
    expect(result.models.get("openrouter")).toEqual(["anthropic/claude-sonnet-4"])
  })

  it("should handle model not in catalog", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "agent1",
          description: "test",
          systemPrompt: "test",
          modelName: "unknown/model",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      entryNodeId: "agent1",
    }
    const result = extractRequiredProviders(config)
    expect(result.providers.size).toBe(0)
  })

  it("should handle nodes without modelName", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "agent1",
          description: "test",
          systemPrompt: "test",
          modelName: "",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      entryNodeId: "agent1",
    }
    const result = extractRequiredProviders(config)
    expect(result.providers.size).toBe(0)
  })

  it("should track multiple models from same provider", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "agent1",
          description: "test",
          systemPrompt: "test",
          modelName: "gpt-4.1-nano",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
        {
          nodeId: "agent2",
          description: "test",
          systemPrompt: "test",
          modelName: "gpt-4.1-mini",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      entryNodeId: "agent1",
    }
    const result = extractRequiredProviders(config)
    expect(result.providers).toEqual(new Set(["openai"]))
    expect(result.models.get("openai")).toEqual(["gpt-4.1-nano", "gpt-4.1-mini"])
  })

  it("should correctly identify groq provider for groq models", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "agent1",
          description: "test",
          systemPrompt: "test",
          modelName: "groq#openai/gpt-oss-20b",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      entryNodeId: "agent1",
    }
    const result = extractRequiredProviders(config)
    // openai/gpt-oss-20b actually uses groq provider!
    expect(result.providers).toEqual(new Set(["groq"]))
    expect(result.models.get("groq")).toEqual(["groq#openai/gpt-oss-20b"])
  })

  it("should handle empty nodes array", () => {
    const config: WorkflowConfig = {
      nodes: [],
      entryNodeId: "agent1",
    }
    const result = extractRequiredProviders(config)
    expect(result.providers.size).toBe(0)
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
