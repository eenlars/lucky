import type { Workflow } from "@core/workflow/Workflow"
import { beforeEach, describe, expect, it, vi } from "vitest"

let mockExplainAgents: ReturnType<typeof vi.fn>
let mockExplainSubsetOfTools: ReturnType<typeof vi.fn>
let mockWorkflowToAdjacencyList: ReturnType<typeof vi.fn>

beforeEach(async () => {
  vi.resetModules()
  mockExplainAgents = vi.fn().mockReturnValue("Agent explanations\n")
  mockExplainSubsetOfTools = vi.fn().mockReturnValue("Tool explanations\n")
  mockWorkflowToAdjacencyList = vi.fn().mockReturnValue("Adjacency list\n")

  vi.doMock("@core/prompts/explainAgents", () => ({
    explainAgents: mockExplainAgents,
  }))
  vi.doMock("@core/prompts/explainTools", () => ({
    explainSubsetOfTools: mockExplainSubsetOfTools,
  }))
  vi.doMock("@core/workflow/actions/generate/toAdjacencyList", () => ({
    workflowToAdjacencyList: mockWorkflowToAdjacencyList,
  }))
})

describe("describeWorkflow", () => {
  it("should describe workflow with default options", async () => {
    const mockWorkflow: Workflow = {
      getConfig: vi.fn().mockReturnValue({
        nodes: [
          {
            nodeId: "node1",
            description: "Test node",
            mcpTools: ["tool1", "tool2"],
            codeTools: ["tool3"],
            handOffs: ["node2", "end"],
          },
        ],
      }),
    } as unknown as Workflow

    const { workflowToString } = await import("../workflowToString")
    const result = workflowToString(mockWorkflow, { easyModelNames: false })

    expect(result).toBe("Tool explanations\nAdjacency list\n")
    expect(mockExplainSubsetOfTools).toHaveBeenCalledWith(["tool1", "tool2", "tool3"])
    expect(mockWorkflowToAdjacencyList).toHaveBeenCalled()
    expect(mockExplainAgents).not.toHaveBeenCalled()
  })
})
