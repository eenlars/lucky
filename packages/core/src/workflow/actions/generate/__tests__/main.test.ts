import type { Workflow } from "@workflow/Workflow"
import { describe, expect, it, vi } from "vitest"
import { workflowToString } from "../workflowToString"

// Create mock instances directly
const mockExplainAgents = vi.fn().mockReturnValue("Agent explanations\n")
const mockExplainSubsetOfTools = vi.fn().mockReturnValue("Tool explanations\n")
const mockWorkflowToAdjacencyList = vi.fn().mockReturnValue("Adjacency list\n")

vi.mock("@workflow/actions/generate/utils/explainAgents", () => ({
  explainAgents: mockExplainAgents,
}))

vi.mock("@workflow/actions/generate/utils/explainTools", () => ({
  explainSubsetOfTools: mockExplainSubsetOfTools,
}))

vi.mock("@workflow/actions/generate/utils/toAdjacencyList", () => ({
  workflowToAdjacencyList: mockWorkflowToAdjacencyList,
}))

describe("describeWorkflow", () => {
  // FAILING: Test expects mocked return values but actual implementation returns different format (agent XML format)
  it("should describe workflow with default options", () => {
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

    const result = workflowToString(mockWorkflow, { easyModelNames: false })

    expect(result).toBe("Tool explanations\nAdjacency list\n")
    expect(mockExplainSubsetOfTools).toHaveBeenCalledWith([
      "tool1",
      "tool2",
      "tool3",
    ])
    expect(mockWorkflowToAdjacencyList).toHaveBeenCalled()
    expect(mockExplainAgents).not.toHaveBeenCalled()
  })
})
