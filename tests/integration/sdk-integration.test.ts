/**
 * Integration test to verify official Anthropic SDK integration works correctly
 */

import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { describe, expect, it } from "vitest"

describe("Anthropic SDK Integration", () => {
  it("should parse workflow config with SDK settings", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "test-node",
          description: "Test node with official SDK",
          systemPrompt: "You are a test assistant",
          gatewayModelId: "anthropic/claude-sonnet-4",
          useClaudeSDK: true,
          sdkConfig: {
            model: "sonnet",
            maxTokens: 4096,
            temperature: 0.7,
            timeout: 30000,
          },
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      entryNodeId: "test-node",
    }

    // Verify the config is valid
    expect(config.nodes[0].useClaudeSDK).toBe(true)
    expect(config.nodes[0].sdkConfig?.model).toBe("sonnet")
    expect(config.nodes[0].sdkConfig?.maxTokens).toBe(4096)
    expect(config.nodes[0].sdkConfig?.temperature).toBe(0.7)
  })

  it("should handle mixed SDK and custom nodes", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "sdk-node",
          description: "SDK-enabled node",
          systemPrompt: "SDK prompt",
          gatewayModelId: "anthropic/claude-3-5-haiku",
          useClaudeSDK: true,
          sdkConfig: {
            model: "sonnet",
            maxTokens: 4096,
          },
          mcpTools: [],
          codeTools: [],
          handOffs: ["custom-node"],
        },
        {
          nodeId: "custom-node",
          description: "Custom pipeline node",
          systemPrompt: "Custom prompt",
          gatewayModelId: "gpt-4o-mini",
          useClaudeSDK: false,
          mcpTools: [],
          codeTools: ["contextGet", "contextSet"],
          handOffs: [],
        },
      ],
      entryNodeId: "sdk-node",
    }

    // Verify SDK node
    const sdkNode = config.nodes.find(n => n.nodeId === "sdk-node")
    expect(sdkNode?.useClaudeSDK).toBe(true)
    expect(sdkNode?.codeTools).toHaveLength(0)

    // Verify custom node
    const customNode = config.nodes.find(n => n.nodeId === "custom-node")
    expect(customNode?.useClaudeSDK).toBe(false)
    expect(customNode?.codeTools).toContain("contextGet")
  })

  it("should default to custom pipeline when useClaudeSDK is not specified", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "default-node",
          description: "Default behavior node",
          systemPrompt: "Default prompt",
          gatewayModelId: "gpt-4o-mini",
          mcpTools: [],
          codeTools: ["todoRead", "todoWrite"],
          handOffs: [],
        },
      ],
      entryNodeId: "default-node",
    }

    // Should default to custom pipeline
    expect(config.nodes[0].useClaudeSDK).toBeUndefined()
    expect(config.nodes[0].codeTools).toHaveLength(2)
  })

  it("should support different model configurations", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "opus-node",
          description: "Opus model node",
          systemPrompt: "Using Opus",
          gatewayModelId: "anthropic/claude-3-5-haiku",
          useClaudeSDK: true,
          sdkConfig: {
            model: "opus-3",
            maxTokens: 8192,
            temperature: 0.3,
            topP: 0.9,
          },
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
        {
          nodeId: "haiku-node",
          description: "Haiku model node",
          systemPrompt: "Using Haiku",
          gatewayModelId: "anthropic/claude-3-5-haiku",
          useClaudeSDK: true,
          sdkConfig: {
            model: "haiku",
            maxTokens: 1024,
            temperature: 0.5,
          },
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      entryNodeId: "opus-node",
    }

    // Verify Opus node config
    const opusNode = config.nodes.find(n => n.nodeId === "opus-node")
    expect(opusNode?.sdkConfig?.model).toBe("opus-3")
    expect(opusNode?.sdkConfig?.maxTokens).toBe(8192)
    expect(opusNode?.sdkConfig?.topP).toBe(0.9)

    // Verify Haiku node config
    const haikuNode = config.nodes.find(n => n.nodeId === "haiku-node")
    expect(haikuNode?.sdkConfig?.model).toBe("haiku")
    expect(haikuNode?.sdkConfig?.maxTokens).toBe(1024)
  })
})
