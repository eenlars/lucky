import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { MODEL_CATALOG, findModel } from "@lucky/models"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the LLM call to return a config that erroneously includes an inactive code tool
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
          modelName: "medium",
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
      medium: "gpt-5-mini",
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

  it("normalizes legacy model names into catalog IDs", async () => {
    const baseConfig: WorkflowConfig = {
      entryNodeId: "main",
      nodes: [
        {
          nodeId: "main",
          description: "Main node",
          systemPrompt: "Do the thing",
          modelName: MODEL_CATALOG.find(m => m.model === "gpt-5-mini")?.model ?? "",
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
          memory: {},
        },
      ],
    }

    const { success, data } = await formalizeWorkflow("Normalize models", {
      workflowConfig: baseConfig,
      verifyWorkflow: "none",
    })

    expect(success).toBe(true)
    expect(data).toBeDefined()
    if (!data) throw new Error("formalizeWorkflow returned no data")

    const normalizedModels = data.nodes.map(node => node.modelName)
    for (const model of normalizedModels) {
      expect(model, `Model ${model} should resolve in catalog`).toBeDefined()
      expect(findModel(model)).toBeTruthy()
    }

    expect(normalizedModels).toContain("openai#gpt-5-mini")
  })
})
