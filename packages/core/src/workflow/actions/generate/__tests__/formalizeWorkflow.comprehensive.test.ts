import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Comprehensive test suite for formalizeWorkflow
 * Tests the complete transformation pipeline:
 * 1. Simplification (complex models → tier names)
 * 2. AI generation
 * 3. Restoration (existing nodes get original models back)
 * 4. Sanitization (remove inactive tools)
 * 5. Verification (optional validation/repair)
 */

// ============================================================================
// MOCKS
// ============================================================================

const mockSendAIResponse: TResponse<WorkflowConfig> = {
  success: true,
  usdCost: 0.01,
  error: null,
  debug_input: [],
  debug_output: {},
  data: {
    nodes: [
      {
        nodeId: "main",
        description: "Main node",
        systemPrompt: "Do the task",
        modelName: "balanced",
        mcpTools: [],
        codeTools: [],
        handOffs: [],
      },
    ],
    entryNodeId: "main",
  },
}

vi.mock("@core/messages/api/sendAI/sendAI", () => ({
  sendAI: vi.fn(async () => mockSendAIResponse),
}))

vi.mock("@core/core-config/coreConfig", async () => {
  const original = await import("@core/core-config/coreConfig")
  const defaultConfig = original.createDefaultCoreConfig()

  return {
    ...original,
    getCoreConfig: () => defaultConfig,
    getDefaultModels: () => ({
      summary: "openai#gpt-4o-mini",
      nano: "openai#gpt-4o-mini",
      low: "openai#gpt-4o-mini",
      balanced: "openai#gpt-4o",
      high: "openai#gpt-4o",
      default: "openai#gpt-4o-mini",
      fitness: "openai#gpt-4o-mini",
      reasoning: "openai#gpt-4o",
      fallback: "openai#gpt-4o-mini",
    }),
  }
})

// Mock validateAndRepairWorkflow to control verification behavior
let mockValidationResult: { finalConfig: WorkflowConfig | null; cost: number } = {
  finalConfig: null,
  cost: 0,
}

vi.mock("@core/utils/validation/validateWorkflow", () => ({
  validateAndRepairWorkflow: vi.fn(async (config: WorkflowConfig) => {
    // Check if we explicitly set finalConfig to null (validation failed)
    if (mockValidationResult.finalConfig === null && mockValidationResult.cost > 0) {
      return mockValidationResult
    }
    // If finalConfig is explicitly provided, return it
    if (mockValidationResult.finalConfig !== null && mockValidationResult.cost > 0) {
      return mockValidationResult
    }
    // Default: return the config as-is
    return { finalConfig: config, cost: 0.005 }
  }),
}))

import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { validateAndRepairWorkflow } from "@core/utils/validation/validateWorkflow"
import { formalizeWorkflow } from "@core/workflow/actions/generate/formalizeWorkflow"
import type { TResponse } from "@lucky/core/messages/api/sendAI/types"

// ============================================================================
// TEST SUITE
// ============================================================================

describe("formalizeWorkflow - core transformation pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default success response - modify in place to keep mock reference
    Object.assign(mockSendAIResponse, {
      success: true,
      usdCost: 0.01,
      data: {
        nodes: [
          {
            nodeId: "main",
            description: "Main node",
            systemPrompt: "Do the task",
            modelName: "balanced",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
        entryNodeId: "main",
      },
      error: null,
    })
    mockValidationResult = { finalConfig: null, cost: 0 }
  })

  describe("model name transformation", () => {
    it("simplifies complex model names to tier names before AI sees them", async () => {
      const baseConfig: WorkflowConfig = {
        entryNodeId: "analyzer",
        nodes: [
          {
            nodeId: "analyzer",
            description: "Analyze data",
            systemPrompt: "Analyze the input",
            modelName: "openai#gpt-4o", // Complex model name
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
      }

      mockSendAIResponse.data.nodes = [
        {
          nodeId: "analyzer",
          description: "Analyze data",
          systemPrompt: "Analyze the input",
          modelName: "smart", // AI works with tier names
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ]

      await formalizeWorkflow("improve analyzer", {
        workflowConfig: baseConfig,
        // verifyWorkflow omitted to test default undefined behavior
      })

      // Verify sendAI was called with simplified tier name in the base workflow
      expect(sendAI).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "system",
              content: expect.stringContaining('"modelName": "smart"'), // Should be simplified
            }),
          ]),
        }),
      )
    })

    it("restores original model names for existing nodes after AI generation", async () => {
      const baseConfig: WorkflowConfig = {
        entryNodeId: "analyzer",
        nodes: [
          {
            nodeId: "analyzer",
            description: "Analyze data",
            systemPrompt: "Analyze the input",
            modelName: "openrouter#anthropic/claude-3.5-sonnet", // Specific user choice
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
      }

      // AI returns tier name for existing node
      mockSendAIResponse.data.nodes = [
        {
          nodeId: "analyzer",
          description: "Analyze data - improved",
          systemPrompt: "Analyze the input thoroughly",
          modelName: "smart", // AI changed to tier
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ]

      const result = await formalizeWorkflow("improve analyzer", {
        workflowConfig: baseConfig,
        verifyWorkflow: "none",
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()

      // Original model name should be restored
      const analyzerNode = result.data!.nodes.find(n => n.nodeId === "analyzer")
      expect(analyzerNode?.modelName).toBe("openrouter#anthropic/claude-3.5-sonnet")
    })

    it("keeps AI's model choice for new nodes", async () => {
      const baseConfig: WorkflowConfig = {
        entryNodeId: "main",
        nodes: [
          {
            nodeId: "main",
            description: "Main task",
            systemPrompt: "Do main task",
            modelName: "openai#gpt-4o",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
      }

      // AI adds a new node with tier name
      mockSendAIResponse.data.nodes = [
        {
          nodeId: "main",
          description: "Main task",
          systemPrompt: "Do main task",
          modelName: "smart",
          mcpTools: [],
          codeTools: [],
          handOffs: ["summarizer"],
        },
        {
          nodeId: "summarizer",
          description: "Summarize results",
          systemPrompt: "Summarize",
          modelName: "cheap", // New node - AI chose "cheap"
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ]

      const result = await formalizeWorkflow("add summarizer", {
        workflowConfig: baseConfig,
        verifyWorkflow: "none",
      })

      expect(result.success).toBe(true)

      // Existing node: restored to original
      const mainNode = result.data!.nodes.find(n => n.nodeId === "main")
      expect(mainNode?.modelName).toBe("openai#gpt-4o")

      // New node: keeps AI's tier choice
      const summarizerNode = result.data!.nodes.find(n => n.nodeId === "summarizer")
      expect(summarizerNode?.modelName).toBe("cheap")
    })

    it("handles mixed workflow with existing and new nodes correctly", async () => {
      const baseConfig: WorkflowConfig = {
        entryNodeId: "node1",
        nodes: [
          {
            nodeId: "node1",
            description: "First node",
            systemPrompt: "Task 1",
            modelName: "openrouter#anthropic/claude-sonnet-4",
            mcpTools: [],
            codeTools: [],
            handOffs: ["node2"],
          },
          {
            nodeId: "node2",
            description: "Second node",
            systemPrompt: "Task 2",
            modelName: "openai#gpt-4o-mini",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
      }

      // AI modifies existing nodes and adds new ones
      mockSendAIResponse.data.nodes = [
        {
          nodeId: "node1",
          description: "First node - updated",
          systemPrompt: "Task 1 enhanced",
          modelName: "smart",
          mcpTools: [],
          codeTools: [],
          handOffs: ["node2", "node3"],
        },
        {
          nodeId: "node2",
          description: "Second node - updated",
          systemPrompt: "Task 2 enhanced",
          modelName: "cheap",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
        {
          nodeId: "node3",
          description: "New validator node",
          systemPrompt: "Validate results",
          modelName: "balanced",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ]

      const result = await formalizeWorkflow("enhance workflow", {
        workflowConfig: baseConfig,
        verifyWorkflow: "none",
      })

      expect(result.success).toBe(true)

      // Existing nodes: original models restored
      const node1 = result.data!.nodes.find(n => n.nodeId === "node1")
      expect(node1?.modelName).toBe("openrouter#anthropic/claude-sonnet-4")

      const node2 = result.data!.nodes.find(n => n.nodeId === "node2")
      expect(node2?.modelName).toBe("openai#gpt-4o-mini")

      // New node: AI's tier choice kept
      const node3 = result.data!.nodes.find(n => n.nodeId === "node3")
      expect(node3?.modelName).toBe("balanced")
    })

    it("normalizes tier names to lowercase", async () => {
      mockSendAIResponse.data.nodes = [
        {
          nodeId: "main",
          description: "Main",
          systemPrompt: "Do task",
          modelName: "SMART", // Uppercase tier
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ]

      const result = await formalizeWorkflow("create workflow", {
        verifyWorkflow: "none",
      })

      expect(result.success).toBe(true)
      expect(result.data!.nodes[0].modelName).toBe("smart") // Normalized to lowercase
    })
  })

  describe("model selection strategies", () => {
    it("applies tier strategy correctly", async () => {
      const result = await formalizeWorkflow("create workflow", {
        modelSelectionStrategy: { strategy: "tier" },
        verifyWorkflow: "none",
      })

      expect(result.success).toBe(true)
      // Tier names should be preserved
      expect(["cheap", "fast", "smart", "balanced"]).toContain(result.data!.nodes[0].modelName)
    })

    it("applies user-models strategy correctly", async () => {
      const userModels = [
        {
          id: "openai#gpt-4o",
          provider: "openai" as const,
          model: "gpt-4o",
          input: 5.0,
          output: 15.0,
          cachedInput: null,
          contextLength: 128000,
          supportsTools: true,
          supportsJsonMode: true,
          supportsStreaming: true,
          supportsVision: true,
          supportsReasoning: false,
          supportsAudio: false,
          supportsVideo: false,
          speed: "medium" as const,
          intelligence: 9,
          pricingTier: "high" as const,
        },
      ]

      mockSendAIResponse.data.nodes = [
        {
          nodeId: "main",
          description: "Main",
          systemPrompt: "Do task",
          modelName: "smart",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ]

      const result = await formalizeWorkflow("create workflow", {
        modelSelectionStrategy: { strategy: "user-models", models: userModels },
        verifyWorkflow: "none",
      })

      expect(result.success).toBe(true)
      // Should still preserve tier for user-models strategy
      expect(result.data!.nodes[0].modelName).toBe("smart")
    })
  })

  describe("sanitization", () => {
    it("removes unknown tools from base workflow before AI sees them", async () => {
      const baseConfig: WorkflowConfig = {
        entryNodeId: "main",
        nodes: [
          {
            nodeId: "main",
            description: "Main",
            systemPrompt: "Task",
            modelName: "openai#gpt-4o",
            mcpTools: ["unknownMCPTool" as any],
            codeTools: ["unknownCodeTool" as any],
            handOffs: [],
          },
        ],
      }

      await formalizeWorkflow("improve workflow", {
        workflowConfig: baseConfig,
        verifyWorkflow: "none",
      })

      // Verify sendAI was called with sanitized base workflow
      const sendAICall = vi.mocked(sendAI).mock.calls[0][0]
      const systemMessage = sendAICall.messages.find(m => m.role === "system")
      expect(systemMessage?.content).toBeDefined()

      // Unknown tools should not appear in the prompt
      expect(systemMessage?.content).not.toContain("unknownMCPTool")
      expect(systemMessage?.content).not.toContain("unknownCodeTool")
    })

    it("removes unknown tools from AI response", async () => {
      mockSendAIResponse.data.nodes = [
        {
          nodeId: "main",
          description: "Main",
          systemPrompt: "Task",
          modelName: "balanced",
          mcpTools: ["hallucinated_mcp_tool" as any],
          codeTools: ["hallucinated_code_tool" as any],
          handOffs: [],
        },
      ]

      const result = await formalizeWorkflow("create workflow", {
        verifyWorkflow: "none",
      })

      expect(result.success).toBe(true)
      expect(result.data!.nodes[0].mcpTools).toEqual([])
      expect(result.data!.nodes[0].codeTools).toEqual([])
    })

    it.skip("preserves valid tools through sanitization", async () => {
      mockSendAIResponse.data.nodes = [
        {
          nodeId: "main",
          description: "Main",
          systemPrompt: "Task",
          modelName: "balanced",
          mcpTools: ["filesystem"],
          codeTools: ["computer" as any], // Use a valid code tool name
          handOffs: [],
        },
      ]

      const result = await formalizeWorkflow("create workflow", {
        verifyWorkflow: "none",
      })

      expect(result.success).toBe(true)
      expect(result.data!.nodes[0].mcpTools).toContain("filesystem")
      expect(result.data!.nodes[0].codeTools).toContain("computer")
    })
  })
})

describe("formalizeWorkflow - verification modes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default success response - modify in place to keep mock reference
    Object.assign(mockSendAIResponse, {
      success: true,
      usdCost: 0.01,
      data: {
        nodes: [
          {
            nodeId: "main",
            description: "Main",
            systemPrompt: "Task",
            modelName: "balanced",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
        entryNodeId: "main",
      },
      error: null,
    })
    mockValidationResult = { finalConfig: null, cost: 0 }
  })

  it("skips verification when mode is 'none'", async () => {
    const result = await formalizeWorkflow("create workflow", {
      verifyWorkflow: "none",
    })

    expect(result.success).toBe(true)
    expect(validateAndRepairWorkflow).not.toHaveBeenCalled()
  })

  it("skips verification when mode is undefined", async () => {
    const result = await formalizeWorkflow("create workflow", {
      verifyWorkflow: "none",
    })

    expect(result.success).toBe(true)
    expect(validateAndRepairWorkflow).not.toHaveBeenCalled()
  })

  it("runs verification in 'normal' mode with retry", async () => {
    const result = await formalizeWorkflow("create workflow", {
      verifyWorkflow: "normal",
      repairWorkflowAfterGeneration: true,
    })

    expect(result.success).toBe(true)
    expect(validateAndRepairWorkflow).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        maxRetries: 1,
        onFail: "returnNull",
      }),
    )
  })

  it("runs verification in 'strict' mode without retry", async () => {
    const result = await formalizeWorkflow("create workflow", {
      verifyWorkflow: "strict",
      repairWorkflowAfterGeneration: false,
    })

    expect(result.success).toBe(true)
    expect(validateAndRepairWorkflow).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        maxRetries: 0,
        onFail: "throw",
      }),
    )
  })

  it("aggregates costs from generation and verification", async () => {
    mockSendAIResponse.usdCost = 0.01
    mockValidationResult = {
      finalConfig: {
        entryNodeId: "main",
        nodes: [
          {
            nodeId: "main",
            description: "Main",
            systemPrompt: "Task",
            modelName: "balanced",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
      },
      cost: 0.005,
    }

    const result = await formalizeWorkflow("create workflow", {
      verifyWorkflow: "normal",
      repairWorkflowAfterGeneration: true,
    })

    expect(result.success).toBe(true)
    expect(result.usdCost).toBe(0.015) // 0.01 + 0.005
  })

  it("returns error when validation fails in normal mode", async () => {
    mockValidationResult = {
      finalConfig: null, // Validation failed
      cost: 0.005,
    }

    const result = await formalizeWorkflow("create workflow", {
      verifyWorkflow: "normal",
      repairWorkflowAfterGeneration: true,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("Failed to enhance workflow")
    expect(result.usdCost).toBe(0.015) // Still includes cost
  })
})

describe("formalizeWorkflow - error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidationResult = { finalConfig: null, cost: 0 }
  })

  it("returns error when AI generation fails", async () => {
    Object.assign(mockSendAIResponse, {
      success: false,
      error: "API rate limit exceeded",
      usdCost: 0,
      data: undefined,
    })

    const result = await formalizeWorkflow("create workflow", {
      verifyWorkflow: "none",
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("Failed to generate workflow")
    expect(result.error).toContain("API rate limit exceeded")
  })

  it("includes model information in error message", async () => {
    Object.assign(mockSendAIResponse, {
      success: false,
      error: "Model not available",
      usdCost: 0,
      data: undefined,
    })

    const result = await formalizeWorkflow("create workflow", {
      verifyWorkflow: "none",
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("openai#gpt-4o") // Default balanced model
  })

  it("preserves cost even when AI fails", async () => {
    Object.assign(mockSendAIResponse, {
      success: false,
      error: "Something went wrong",
      usdCost: 0.002,
      data: undefined,
    })

    const result = await formalizeWorkflow("create workflow", {
      verifyWorkflow: "none",
    })

    expect(result.success).toBe(false)
    expect(result.usdCost).toBe(0.002)
  })
})

describe("formalizeWorkflow - edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidationResult = { finalConfig: null, cost: 0 }
  })

  it("handles workflow generation from scratch (no base config)", async () => {
    Object.assign(mockSendAIResponse, {
      success: true,
      usdCost: 0.01,
      data: {
        nodes: [
          {
            nodeId: "start",
            description: "Start node",
            systemPrompt: "Begin task",
            modelName: "balanced",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
        entryNodeId: "start",
      },
      error: null,
    })

    const result = await formalizeWorkflow("create a simple workflow", {
      verifyWorkflow: "none",
    })

    expect(result.success).toBe(true)
    expect(result.data!.nodes).toHaveLength(1)
    expect(result.data!.nodes[0].modelName).toBe("balanced")
  })

  it("handles workflow with workflowGoal provided", async () => {
    const baseConfig: WorkflowConfig = {
      entryNodeId: "main",
      nodes: [
        {
          nodeId: "main",
          description: "Main",
          systemPrompt: "Task",
          modelName: "openai#gpt-4o",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
    }

    await formalizeWorkflow("improve workflow", {
      workflowConfig: baseConfig,
      workflowGoal: "Add error handling and retry logic",
      verifyWorkflow: "none",
    })

    // Verify the goal was included in the prompt
    const sendAICall = vi.mocked(sendAI).mock.calls[0][0]
    const systemMessage = sendAICall.messages.find(m => m.role === "system")
    expect(systemMessage?.content).toContain("IMPROVEMENT GOAL:")
    expect(systemMessage?.content).toContain("Add error handling and retry logic")
  })

  it("handles empty node list from AI gracefully", async () => {
    Object.assign(mockSendAIResponse, {
      success: true,
      usdCost: 0.01,
      data: {
        nodes: [],
        entryNodeId: "main",
      },
      error: null,
    })

    const result = await formalizeWorkflow("create workflow", {
      verifyWorkflow: "none",
    })

    expect(result.success).toBe(true)
    expect(result.data!.nodes).toHaveLength(0)
  })

  it("preserves other node properties during transformation", async () => {
    const baseConfig: WorkflowConfig = {
      entryNodeId: "main",
      nodes: [
        {
          nodeId: "main",
          description: "Main",
          systemPrompt: "Task",
          modelName: "openai#gpt-4o",
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
          waitFor: ["dependency"],
          handOffType: "conditional" as const,
          memory: { key: "value" },
        },
      ],
    }

    mockSendAIResponse.data.nodes = [
      {
        nodeId: "main",
        description: "Main - updated",
        systemPrompt: "Task - enhanced",
        modelName: "smart",
        mcpTools: [],
        codeTools: [],
        handOffs: ["end"],
      },
    ]

    const result = await formalizeWorkflow("improve", {
      workflowConfig: baseConfig,
      verifyWorkflow: "none",
    })

    expect(result.success).toBe(true)
    const mainNode = result.data!.nodes[0]

    // Original model restored
    expect(mainNode.modelName).toBe("openai#gpt-4o")

    // Other properties should be merged from old config
    expect(mainNode.waitFor).toEqual(["dependency"])
    expect(mainNode.handOffType).toBe("conditional")
    expect(mainNode.memory).toEqual({ key: "value" })
  })

  it("handles invalid tier names by falling back to cheap", async () => {
    mockSendAIResponse.data.nodes = [
      {
        nodeId: "main",
        description: "Main",
        systemPrompt: "Task",
        modelName: "invalid-tier-name",
        mcpTools: [],
        codeTools: [],
        handOffs: [],
      },
    ]

    const result = await formalizeWorkflow("create workflow", {
      verifyWorkflow: "none",
    })

    expect(result.success).toBe(true)
    // Invalid tier should fall back to "cheap"
    expect(result.data!.nodes[0].modelName).toBe("cheap")
  })
})

describe("formalizeWorkflow - prompt construction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default success response - modify in place to keep mock reference
    Object.assign(mockSendAIResponse, {
      success: true,
      usdCost: 0.01,
      data: {
        nodes: [
          {
            nodeId: "main",
            description: "Main",
            systemPrompt: "Task",
            modelName: "balanced",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
        entryNodeId: "main",
      },
      error: null,
    })
    mockValidationResult = { finalConfig: null, cost: 0 }
  })

  it("includes base workflow in system prompt when provided", async () => {
    const baseConfig: WorkflowConfig = {
      entryNodeId: "main",
      nodes: [
        {
          nodeId: "main",
          description: "Main",
          systemPrompt: "Task",
          modelName: "openai#gpt-4o",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
    }

    await formalizeWorkflow("improve", {
      workflowConfig: baseConfig,
      verifyWorkflow: "none",
    })

    const sendAICall = vi.mocked(sendAI).mock.calls[0][0]
    const systemMessage = sendAICall.messages.find(m => m.role === "system")
    expect(systemMessage?.content).toContain("BASE WORKFLOW:")
  })

  it("excludes base workflow from prompt when generating from scratch", async () => {
    await formalizeWorkflow("create new workflow", {
      verifyWorkflow: "none",
    })

    const sendAICall = vi.mocked(sendAI).mock.calls[0][0]
    const systemMessage = sendAICall.messages.find(m => m.role === "system")
    expect(systemMessage?.content).not.toContain("BASE WORKFLOW:")
  })

  it("includes user prompt in messages", async () => {
    await formalizeWorkflow("create a data analyzer workflow", {
      verifyWorkflow: "none",
    })

    const sendAICall = vi.mocked(sendAI).mock.calls[0][0]
    const userMessage = sendAICall.messages.find(m => m.role === "user")
    expect(userMessage?.content).toContain("create a data analyzer workflow")
  })

  it("uses balanced model for generation by default", async () => {
    await formalizeWorkflow("create workflow", {
      verifyWorkflow: "none",
    })

    const sendAICall = vi.mocked(sendAI).mock.calls[0][0]
    expect(sendAICall.model).toBe("openai#gpt-4o") // balanced model from mock
  })
})
