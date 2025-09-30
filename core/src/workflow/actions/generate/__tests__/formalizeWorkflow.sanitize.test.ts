import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the LLM call to return a config that erroneously includes an inactive MCP tool
vi.mock("@core/messages/api/sendAI/sendAI", () => ({
  sendAI: vi.fn().mockResolvedValue({
    success: true,
    usdCost: 0,
    data: {
      nodes: [
        {
          nodeId: "main",
          description: "Main node",
          systemPrompt: "Do the thing",
          modelName: "medium",
          // simulate LLM echoing the inactive tool back
          mcpTools: ["browserUse"],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
      entryNodeId: "main",
    },
  }),
}))

// Mock core config to mark browserUse as inactive
vi.mock("@core/core-config/index", () => ({
  isToolInactive: (toolName: string) => toolName === "browserUse",
  getCoreConfig: () => ({
    tools: {
      inactive: new Set(["browserUse"]),
    },
  }),
}))

import { getDefaultModels } from "@core/core-config/compat"
import { formalizeWorkflow } from "@core/workflow/actions/generate/formalizeWorkflow"

describe("formalizeWorkflow sanitization (core defaults)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("keeps active MCP tools by default (browserUse remains active in core)", async () => {
    const baseConfig: WorkflowConfig = {
      entryNodeId: "main",
      nodes: [
        {
          nodeId: "main",
          description: "Main node",
          systemPrompt: "Do the thing",
          modelName: getDefaultModels().default,
          // inactive tool present in base config to simulate creep
          mcpTools: ["browserUse" as any],
          codeTools: [],
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
    // Under core defaults, browserUse is active so it should not be removed
    for (const node of data.nodes) {
      expect(node.mcpTools).toContain("browserUse")
    }
  })
})
