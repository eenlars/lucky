import { findModel } from "@lucky/models"
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import {
  WorkflowConfigSchemaEasy,
  handleWorkflowCompletionTierStrategy,
  handleWorkflowCompletionUserModelsStrategy,
} from "../workflowSchema"

// Mock console.warn to test fallback warnings
const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

// Mock the models module
vi.mock("@lucky/models", () => ({
  findModel: vi.fn(),
  getActiveModelsByGateway: vi.fn(() => []),
  mapGatewayModelIdToEasyName: vi.fn((_name: string) => "balanced"),
  getCatalog: vi.fn(() => []),
  getModelsByGateway: vi.fn(() => []),
}))

describe("workflowSchema - model name validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consoleWarnSpy.mockClear()
  })

  const createTestWorkflow = (gatewayModelId: string) =>
    WorkflowConfigSchemaEasy.parse({
      nodes: [
        {
          nodeId: "test-node",
          description: "test node",
          systemPrompt: "test prompt",
          gatewayModelId,
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      entryNodeId: "test-node",
    })

  describe("handleWorkflowCompletionTierStrategy", () => {
    describe("tier name handling", () => {
      it("preserves valid tier names (cheap, fast, smart, balanced)", () => {
        const tiers = ["cheap", "fast", "smart", "balanced"]

        for (const tier of tiers) {
          const workflow = createTestWorkflow(tier)
          const result = handleWorkflowCompletionTierStrategy(null, workflow)

          expect(result.nodes[0].gatewayModelId).toBe(tier)
        }
        expect(consoleWarnSpy).not.toHaveBeenCalled()
      })

      it("normalizes uppercase tier names to lowercase", () => {
        ;(findModel as any).mockReturnValue(undefined)

        const testCases = ["CHEAP", "FAST", "SMART", "BALANCED"]

        for (const tier of testCases) {
          const workflow = createTestWorkflow(tier)
          const result = handleWorkflowCompletionTierStrategy(null, workflow)

          expect(result.nodes[0].gatewayModelId).toBe(tier.toLowerCase())
        }
        expect(consoleWarnSpy).not.toHaveBeenCalled()
      })

      it("normalizes mixed case tier names", () => {
        const testCases = [
          { input: "Cheap", expected: "cheap" },
          { input: "Fast", expected: "fast" },
          { input: "Smart", expected: "smart" },
          { input: "Balanced", expected: "balanced" },
        ]

        for (const { input, expected } of testCases) {
          const workflow = createTestWorkflow(input)
          const result = handleWorkflowCompletionTierStrategy(null, workflow)

          expect(result.nodes[0].gatewayModelId).toBe(expected)
        }
        expect(consoleWarnSpy).not.toHaveBeenCalled()
      })
    })

    describe("model ID handling", () => {
      it("resolves valid model names to catalog IDs", () => {
        ;(findModel as any).mockReturnValueOnce({
          gateway: "openai-api" as const,
          gatewayModelId: "gpt-4o",
        } as any)

        const workflow = createTestWorkflow("gpt-4o")
        const result = handleWorkflowCompletionTierStrategy(null, workflow)

        expect(result.nodes[0].gatewayModelId).toBe("gpt-4o")
        expect(consoleWarnSpy).not.toHaveBeenCalled()
      })

      it("preserves already-valid catalog IDs", () => {
        ;(findModel as any).mockReturnValueOnce({
          gateway: "openai-api" as const,
          gatewayModelId: "gpt-4o",
        } as any)

        const workflow = createTestWorkflow("gpt-4o")
        const result = handleWorkflowCompletionTierStrategy(null, workflow)

        expect(result.nodes[0].gatewayModelId).toBe("gpt-4o")
        expect(consoleWarnSpy).not.toHaveBeenCalled()
      })
    })

    describe("fallback behavior", () => {
      it("falls back to cheap tier for unknown model names", () => {
        ;(findModel as any).mockReturnValue(undefined)

        const workflow = createTestWorkflow("nonexistent-model-xyz")
        const result = handleWorkflowCompletionTierStrategy(null, workflow)

        expect(result.nodes[0].gatewayModelId).toBe("cheap")
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Model "nonexistent-model-xyz" not found in catalog, falling back to tier: cheap',
        )
      })

      it("handles empty model names", () => {
        ;(findModel as any).mockReturnValue(undefined)

        const workflow = createTestWorkflow("")
        const result = handleWorkflowCompletionTierStrategy(null, workflow)

        expect(result.nodes[0].gatewayModelId).toBe("cheap")
        expect(consoleWarnSpy).toHaveBeenCalledWith('Model "" not found in catalog, falling back to tier: cheap')
      })
    })

    describe("workflow merging", () => {
      it("merges with old workflow data when available", () => {
        const oldWorkflow = {
          nodes: [
            {
              nodeId: "test-node",
              gatewayModelId: "old-model",
              gateway: "openai-api",
              description: "old description",
              systemPrompt: "old prompt",
              mcpTools: ["old-tool"],
              codeTools: ["old-code-tool"],
              handOffs: ["n2"],
              extraField: "should be preserved",
            } as any,
          ],
          entryNodeId: "test-node",
        }

        const workflow = createTestWorkflow("cheap")
        const result = handleWorkflowCompletionTierStrategy(oldWorkflow, workflow)

        expect(result.nodes[0].gatewayModelId).toBe("cheap")
        expect(result.nodes[0].description).toBe("test node")
        expect((result.nodes[0] as any).extraField).toBe("should be preserved")
      })
    })
  })

  describe("handleWorkflowCompletionUserModelsStrategy", () => {
    beforeEach(() => {
      vi.clearAllMocks()
      consoleWarnSpy.mockClear()
    })

    it("handles tier names identically to tier strategy", () => {
      const tiers = ["cheap", "fast", "smart", "balanced"]

      for (const tier of tiers) {
        const workflow = createTestWorkflow(tier)
        const result = handleWorkflowCompletionUserModelsStrategy(null, workflow)

        expect(result.nodes[0].gatewayModelId).toBe(tier)
      }
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it("normalizes uppercase tier names", () => {
      const workflow = createTestWorkflow("SMART")
      const result = handleWorkflowCompletionUserModelsStrategy(null, workflow)

      expect(result.nodes[0].gatewayModelId).toBe("smart")
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it("resolves model IDs from catalog", () => {
      ;(findModel as any).mockReturnValueOnce({
        gateway: "groq-api" as const,
        gatewayModelId: "llama-3.1-70b",
      } as any)

      const workflow = createTestWorkflow("llama-3.1-70b")
      const result = handleWorkflowCompletionUserModelsStrategy(null, workflow)

      expect(result.nodes[0].gatewayModelId).toBe("llama-3.1-70b")
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it("falls back to cheap for invalid models", () => {
      ;(findModel as any).mockReturnValue(undefined)

      const workflow = createTestWorkflow("fake-model")
      const result = handleWorkflowCompletionUserModelsStrategy(null, workflow)

      expect(result.nodes[0].gatewayModelId).toBe("cheap")
      expect(consoleWarnSpy).toHaveBeenCalledWith('Model "fake-model" not found, falling back to tier: cheap')
    })

    it("merges with old workflow preserving custom fields", () => {
      const oldWorkflow = {
        nodes: [
          {
            nodeId: "test-node",
            gatewayModelId: "old",
            gateway: "openai-api",
            description: "old",
            systemPrompt: "old",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
            customData: "preserve-me",
          } as any,
        ],
        entryNodeId: "test-node",
      }

      const workflow = createTestWorkflow("balanced")
      const result = handleWorkflowCompletionUserModelsStrategy(oldWorkflow, workflow)

      expect(result.nodes[0].gatewayModelId).toBe("balanced")
      expect((result.nodes[0] as any).customData).toBe("preserve-me")
    })
  })

  describe("integration scenarios", () => {
    it("handles workflow with multiple nodes of mixed types", () => {
      // setup mock to handle all lookups correctly
      ;(findModel as any).mockImplementation((input: string) => {
        if (input === "gpt-4o") {
          return { gateway: "openai-api" as const, gatewayModelId: "gpt-4o" }
        }
        return undefined
      })

      const workflow = WorkflowConfigSchemaEasy.parse({
        nodes: [
          {
            nodeId: "n1",
            gatewayModelId: "cheap",
            gateway: "openai-api",
            description: "tier",
            systemPrompt: "t",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
          {
            nodeId: "n2",
            gatewayModelId: "gpt-4o",
            gateway: "openai-api",
            description: "model",
            systemPrompt: "t",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
          {
            nodeId: "n3",
            gatewayModelId: "invalid",
            gateway: "openai-api",
            description: "bad",
            systemPrompt: "t",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
        entryNodeId: "n1",
      })

      const result = handleWorkflowCompletionTierStrategy(null, workflow)

      expect(result.nodes[0].gatewayModelId).toBe("cheap")
      expect(result.nodes[1].gatewayModelId).toBe("gpt-4o")
      expect(result.nodes[2].gatewayModelId).toBe("cheap")
      expect(consoleWarnSpy).toHaveBeenCalledWith('Model "invalid" not found in catalog, falling back to tier: cheap')
    })
  })

  afterAll(() => {
    consoleWarnSpy.mockRestore()
  })
})
