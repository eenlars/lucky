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

import { formalizeWorkflow } from "@core/workflow/actions/generate/formalizeWorkflow"
import { getDefaultModels } from "@runtime/settings/models"

describe("formalizeWorkflow sanitization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("strips inactive/unknown MCP tools from the returned config (was failing before)", async () => {
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
    // The returned nodes must not include the inactive tool anymore
    for (const node of data.nodes) {
      expect(node.mcpTools).not.toContain("browserUse")
    }
  })
})
