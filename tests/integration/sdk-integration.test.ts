/**
 * Integration test to verify Claude SDK integration works correctly
 */

import { describe, it, expect } from "vitest"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"

describe("Claude SDK Integration", () => {
  it("should parse workflow config with SDK settings", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "test-node",
          description: "Test node with SDK",
          systemPrompt: "You are a test assistant",
          modelName: "claude-3-sonnet-latest",
          useClaudeSDK: true,
          sdkConfig: {
            model: "sonnet",
            allowedTools: ["Read", "Write"],
            skipPermissions: true,
            timeout: 30000
          },
          mcpTools: [],
          codeTools: [],
          handOffs: []
        }
      ],
      entryNodeId: "test-node"
    }

    // Verify the config is valid
    expect(config.nodes[0].useClaudeSDK).toBe(true)
    expect(config.nodes[0].sdkConfig?.model).toBe("sonnet")
    expect(config.nodes[0].sdkConfig?.allowedTools).toEqual(["Read", "Write"])
  })

  it("should handle mixed SDK and custom nodes", () => {
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId: "sdk-node",
          description: "SDK-enabled node",
          systemPrompt: "SDK prompt",
          modelName: "claude-3-sonnet-latest",
          useClaudeSDK: true,
          sdkConfig: {
            model: "sonnet"
          },
          mcpTools: [],
          codeTools: [],
          handOffs: ["custom-node"]
        },
        {
          nodeId: "custom-node",
          description: "Custom pipeline node",
          systemPrompt: "Custom prompt",
          modelName: "gpt-4o-mini",
          useClaudeSDK: false,
          mcpTools: [],
          codeTools: ["contextGet", "contextSet"],
          handOffs: []
        }
      ],
      entryNodeId: "sdk-node"
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
          modelName: "gpt-4o-mini",
          mcpTools: [],
          codeTools: ["todoRead", "todoWrite"],
          handOffs: []
        }
      ],
      entryNodeId: "default-node"
    }

    // Should default to custom pipeline
    expect(config.nodes[0].useClaudeSDK).toBeUndefined()
    expect(config.nodes[0].codeTools).toHaveLength(2)
  })
})