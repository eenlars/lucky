import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { MODEL_CATALOG, findModelByName } from "@lucky/models"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the LLM call to return a workflow with tier name "balanced"
vi.mock("@core/messages/api/sendAI/sendAI", () => ({
  sendAI: vi.fn().mockResolvedValue({
    success: true,
    usdCost: 0,
    data: {
      nodes: [
        {
          nodeId: "main",
          description: "desc",
          systemPrompt: "Do the thing",
          modelName: "balanced",
          // simulate LLM echoing the inactive tool back
          mcpTools: [],
          codeTools: ["testInactiveTool"], // Using a fake tool we'll mark as inactive
          handOffs: ["end"],
        },
      ],
      entryNodeId: "main",
    },
  }),
}))

// Mock core config to mark testInactiveTool as inactive for this test
vi.mock("@core/core-config/coreConfig", async () => {
  const original = await import("@core/core-config/coreConfig")
  const defaultConfig = original.createDefaultCoreConfig()

  return {
    ...original,
    isToolInactive: (toolName: string) => toolName === "testInactiveTool",
    getCoreConfig: () => ({
      ...defaultConfig,
      tools: {
        ...defaultConfig.tools,
        inactive: ["testInactiveTool"],
      },
    }),
    getDefaultModels: () => ({
      summary: "gpt-5-nano",
      nano: "gpt-5-nano",
      low: "gpt-5-mini",
      balanced: "gpt-5-mini",
      high: "gpt-5",
      default: "gpt-5-nano",
      fitness: "gpt-5-mini",
      reasoning: "gpt-5",
      fallback: "gpt-5-mini",
    }),
  }
})

import { getDefaultModels } from "@core/core-config/coreConfig"
import { formalizeWorkflow } from "@core/workflow/actions/generate/formalizeWorkflow"

describe("formalizeWorkflow sanitization (core defaults)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("removes inactive code tools (testInactiveTool marked as inactive)", async () => {
    const baseConfig: WorkflowConfig = {
      entryNodeId: "main",
      nodes: [
        {
          nodeId: "main",
          description: "Main node",
          systemPrompt: "Do the thing",
          modelName: getDefaultModels().default,
          // inactive tool present in base config to simulate creep
          mcpTools: [],
          codeTools: ["testInactiveTool" as any],
          handOffs: ["end"],
          memory: {},
        },
      ],
    }

    const { success, data } = await formalizeWorkflow("Test sanitize", {
      workflowConfig: baseConfig,
      verifyWorkflow: "none",
    })

    expect(success).toBe(true)
    expect(data).toBeDefined()
    if (!data) throw new Error("formalizeWorkflow returned no data")
    // testInactiveTool is inactive in the mocked config, so it should be removed by sanitization
    for (const node of data.nodes) {
      expect(node.codeTools).not.toContain("testInactiveTool")
    }
  })

  it("preserves tier names for execution-time resolution", async () => {
    // No base config - generate a new workflow from scratch
    // The mock returns a node with modelName "balanced" (tier name)
    // Tier names are preserved for execution-time resolution (not converted to catalog IDs)
    const { success, data, error } = await formalizeWorkflow("Normalize models", {
      verifyWorkflow: "none",
    })

    expect(success).toBe(true)
    expect(data).toBeDefined()
    if (!data) throw new Error("formalizeWorkflow returned no data")

    // Mock returns "balanced" which should be preserved as a tier name
    // Tier names (cheap, fast, smart, balanced) are preserved for execution-time resolution
    // They get resolved to actual models when the workflow executes, not during generation
    const normalizedModels = data.nodes.map(node => node.modelName)

    // Verify tier name "balanced" is preserved (normalized to lowercase)
    expect(normalizedModels).toContain("balanced")

    // Verify it's a valid tier name
    const tierNames = ["cheap", "fast", "smart", "balanced"]
    for (const model of normalizedModels) {
      const isTierName = tierNames.includes(model)
      const isInCatalog = findModelByName(model) !== undefined
      expect(isTierName || isInCatalog, `Model ${model} should be either a tier name or in catalog`).toBe(true)
    }
  })
})
