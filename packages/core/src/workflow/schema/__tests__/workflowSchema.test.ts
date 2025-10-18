import { describe, expect, it, vi, beforeEach, afterAll } from "vitest"
import {
  handleWorkflowCompletionTierStrategy,
  handleWorkflowCompletionUserModelsStrategy,
  WorkflowConfigSchemaEasy,
} from "../workflowSchema"
import { findModelById, findModelByName } from "@lucky/models"

// Mock console.warn to test fallback warnings
const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

// Mock the models module
vi.mock("@lucky/models", () => ({
  findModelById: vi.fn(),
  findModelByName: vi.fn(),
  getActiveModelsByProvider: vi.fn(() => []),
  mapModelNameToEasyName: vi.fn((name: string) => "balanced"),
  getCatalog: vi.fn(() => []),
  getModelsByProvider: vi.fn(() => []),
}))

describe("workflowSchema - model name validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consoleWarnSpy.mockClear()
  })

  const createTestWorkflow = (modelName: string) =>
    WorkflowConfigSchemaEasy.parse({
      nodes: [
        {
          nodeId: "test-node",
          description: "test node",
          systemPrompt: "test prompt",
          modelName,
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

          expect(result.nodes[0].modelName).toBe(tier)
        }
        expect(consoleWarnSpy).not.toHaveBeenCalled()
      })

      it("normalizes uppercase tier names to lowercase", () => {
        ;(findModelById as any).mockReturnValue(undefined)
        ;(findModelByName as any).mockReturnValue(undefined)

        const testCases = ["CHEAP", "FAST", "SMART", "BALANCED"]

        for (const tier of testCases) {
          const workflow = createTestWorkflow(tier)
          const result = handleWorkflowCompletionTierStrategy(null, workflow)

          expect(result.nodes[0].modelName).toBe(tier.toLowerCase())
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

          expect(result.nodes[0].modelName).toBe(expected)
        }
        expect(consoleWarnSpy).not.toHaveBeenCalled()
      })
    })

    describe("model ID handling", () => {
      it("resolves valid model names to catalog IDs", () => {
        ;(findModelById as any).mockReturnValueOnce(undefined)
        ;(findModelByName as any).mockReturnValueOnce({
          id: "openai#gpt-4o",
          provider: "openai",
          model: "gpt-4o",
        } as any)

        const workflow = createTestWorkflow("gpt-4o")
        const result = handleWorkflowCompletionTierStrategy(null, workflow)

        expect(result.nodes[0].modelName).toBe("openai#gpt-4o")
        expect(consoleWarnSpy).not.toHaveBeenCalled()
      })

      it("preserves already-valid catalog IDs", () => {
        ;(findModelById as any).mockReturnValueOnce({
          id: "openai#gpt-4o",
          provider: "openai",
          model: "gpt-4o",
        } as any)

        const workflow = createTestWorkflow("openai#gpt-4o")
        const result = handleWorkflowCompletionTierStrategy(null, workflow)

        expect(result.nodes[0].modelName).toBe("openai#gpt-4o")
        expect(consoleWarnSpy).not.toHaveBeenCalled()
      })
    })

    describe("fallback behavior", () => {
      it("falls back to cheap tier for unknown model names", () => {
        ;(findModelById as any).mockReturnValue(undefined)
        ;(findModelByName as any).mockReturnValue(undefined)

        const workflow = createTestWorkflow("nonexistent-model-xyz")
        const result = handleWorkflowCompletionTierStrategy(null, workflow)

        expect(result.nodes[0].modelName).toBe("cheap")
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Model "nonexistent-model-xyz" not found in catalog, falling back to tier: cheap',
        )
      })

      it("handles empty model names", () => {
        ;(findModelById as any).mockReturnValue(undefined)
        ;(findModelByName as any).mockReturnValue(undefined)

        const workflow = createTestWorkflow("")
        const result = handleWorkflowCompletionTierStrategy(null, workflow)

        expect(result.nodes[0].modelName).toBe("cheap")
        expect(consoleWarnSpy).toHaveBeenCalledWith('Model "" not found in catalog, falling back to tier: cheap')
      })
    })

    describe("workflow merging", () => {
      it("merges with old workflow data when available", () => {
        const oldWorkflow = {
          nodes: [
            {
              nodeId: "test-node",
              modelName: "old-model",
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

        expect(result.nodes[0].modelName).toBe("cheap")
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

        expect(result.nodes[0].modelName).toBe(tier)
      }
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it("normalizes uppercase tier names", () => {
      const workflow = createTestWorkflow("SMART")
      const result = handleWorkflowCompletionUserModelsStrategy(null, workflow)

      expect(result.nodes[0].modelName).toBe("smart")
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it("resolves model IDs from catalog", () => {
      ;(findModelById as any).mockReturnValueOnce({
        id: "groq#llama-3.1-70b",
        provider: "groq",
        model: "llama-3.1-70b",
      } as any)

      const workflow = createTestWorkflow("groq#llama-3.1-70b")
      const result = handleWorkflowCompletionUserModelsStrategy(null, workflow)

      expect(result.nodes[0].modelName).toBe("groq#llama-3.1-70b")
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it("falls back to cheap for invalid models", () => {
      ;(findModelById as any).mockReturnValue(undefined)
      ;(findModelByName as any).mockReturnValue(undefined)

      const workflow = createTestWorkflow("fake-model")
      const result = handleWorkflowCompletionUserModelsStrategy(null, workflow)

      expect(result.nodes[0].modelName).toBe("cheap")
      expect(consoleWarnSpy).toHaveBeenCalledWith('Model "fake-model" not found, falling back to tier: cheap')
    })

    it("merges with old workflow preserving custom fields", () => {
      const oldWorkflow = {
        nodes: [
          {
            nodeId: "test-node",
            modelName: "old",
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

      expect(result.nodes[0].modelName).toBe("balanced")
      expect((result.nodes[0] as any).customData).toBe("preserve-me")
    })
  })

  describe("integration scenarios", () => {
    it("handles workflow with multiple nodes of mixed types", () => {
      // setup mock to handle all lookups correctly
      ;(findModelById as any).mockImplementation((id: string) => {
        if (id === "openai#gpt-4o") {
          return { id: "openai#gpt-4o", provider: "openai", model: "gpt-4o" }
        }
        return undefined
      })
      ;(findModelByName as any).mockImplementation((name: string) => {
        if (name === "openai#gpt-4o") {
          return { id: "openai#gpt-4o", provider: "openai", model: "gpt-4o" }
        }
        return undefined
      })

      const workflow = WorkflowConfigSchemaEasy.parse({
        nodes: [
          {
            nodeId: "n1",
            modelName: "cheap",
            description: "tier",
            systemPrompt: "t",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
          {
            nodeId: "n2",
            modelName: "openai#gpt-4o",
            description: "model",
            systemPrompt: "t",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
          {
            nodeId: "n3",
            modelName: "invalid",
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

      expect(result.nodes[0].modelName).toBe("cheap")
      expect(result.nodes[1].modelName).toBe("openai#gpt-4o")
      expect(result.nodes[2].modelName).toBe("cheap")
      expect(consoleWarnSpy).toHaveBeenCalledWith('Model "invalid" not found in catalog, falling back to tier: cheap')
    })
  })

  afterAll(() => {
    consoleWarnSpy.mockRestore()
  })
})
