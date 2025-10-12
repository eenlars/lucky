import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock sendAI to return a config that includes an active tool
vi.mock("@core/messages/api/sendAI/sendAI", () => ({
  sendAI: vi.fn().mockResolvedValue({
    success: true,
    usdCost: 0,
    data: {
      nodes: [
        {
          nodeId: "step-1",
          description: "desc",
          systemPrompt: "sp",
          modelName: "openai/gpt-4.1-mini",
          mcpTools: [],
          codeTools: ["todoWrite"],
          handOffs: ["end"],
          memory: {},
        },
      ],
      entryNodeId: "step-1",
    },
  }),
}))

import { getDefaultModels } from "@core/core-config/coreConfig"
import { improveWorkflowUnified } from "@core/improvement/behavioral/judge/improveWorkflow"

describe("improveWorkflowUnified sanitization (core defaults)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("keeps active tools by default (todoWrite remains active in core)", async () => {
    const config: WorkflowConfig = {
      entryNodeId: "step-1",
      nodes: [
        {
          nodeId: "step-1",
          description: "desc",
          systemPrompt: "sp",
          modelName: getDefaultModels().reasoning,
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
          memory: {},
        },
      ],
    }

    const fitness: FitnessOfWorkflow = {
      score: 80,
      totalCostUsd: 0.1,
      totalTimeSeconds: 100,
      accuracy: 90,
    }

    const { improvedConfig } = await improveWorkflowUnified({
      config,
      fitness,
      feedback: "ok",
    })

    expect(improvedConfig).not.toBeNull()
    for (const node of improvedConfig!.nodes) {
      expect(node.codeTools).toContain("todoWrite")
    }
  })
})
