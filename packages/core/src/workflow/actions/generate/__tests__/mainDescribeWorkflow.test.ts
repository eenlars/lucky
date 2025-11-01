import type { Workflow } from "@core/workflow/Workflow"
import { describe, expect, it, vi } from "vitest"
import { workflowToString } from "../workflowToString"

// Mock the tool types to include the test tools
vi.mock("@core/tools/tool.types", () => ({
  ALL_ACTIVE_TOOL_NAMES: ["todoRead", "todoWrite", "tavily"],
  ACTIVE_TOOLS_WITH_DESCRIPTION: {
    todoRead: "Read the current session's todo list",
    todoWrite: "Create and manage structured task lists",
    tavily: "Search the web",
  },
}))

describe("describeWorkflow", () => {
  const mockWorkflow = {
    getConfig: () => ({
      nodes: [
        {
          id: "node1",
          systemPrompt: "Test prompt",
          mcpTools: ["tavily"],
          codeTools: ["todoRead", "todoWrite"],
          handoffs: [{ to: "node2", rules: "Always" }],
        },
        {
          id: "node2",
          systemPrompt: "Another prompt",
          mcpTools: [],
          codeTools: ["invalidTool"], // this tool doesn't exist
          handoffs: [],
        },
      ],
      model: "test-model",
    }),
  } as unknown as Workflow

  it("should include tool explanations when includeToolExplanations is true", () => {
    const result = workflowToString(mockWorkflow, {
      includeToolExplanations: true,
      includeAdjacencyList: false,
      includeAgents: false,
      tierMappingEnabled: false,
    })

    console.log("Result with tool explanations:", result)
    expect(result).toContain("todoRead")
    expect(result).toContain("todoWrite")
  })

  it("should not include tool explanations when includeToolExplanations is false", () => {
    const result = workflowToString(mockWorkflow, {
      includeToolExplanations: false,
      includeAdjacencyList: false,
      includeAgents: false,
      tierMappingEnabled: false,
    })

    console.log("Result without tool explanations:", result)
    expect(result).not.toContain("todoRead")
    expect(result).not.toContain("todoWrite")
    expect(result).toBe("")
  })

  it("should handle workflows with no tools", () => {
    const emptyToolWorkflow = {
      getConfig: () => ({
        nodes: [
          {
            id: "node1",
            systemPrompt: "Test prompt",
            mcpTools: [],
            codeTools: [],
            handoffs: [],
          },
        ],
        model: "test-model",
      }),
    } as unknown as Workflow

    const result = workflowToString(emptyToolWorkflow, {
      includeToolExplanations: true,
      includeAdjacencyList: false,
      includeAgents: false,
      tierMappingEnabled: false,
    })

    console.log("Result with no tools:", result)
    expect(result).toBe("")
  })

  it("should handle workflows with only invalid tools", () => {
    const invalidToolWorkflow = {
      getConfig: () => ({
        nodes: [
          {
            id: "node1",
            systemPrompt: "Test prompt",
            mcpTools: ["invalidMcpTool"],
            codeTools: ["invalidCodeTool"],
            handoffs: [],
          },
        ],
        model: "test-model",
      }),
    } as unknown as Workflow

    const result = workflowToString(invalidToolWorkflow, {
      includeToolExplanations: true,
      includeAdjacencyList: false,
      includeAgents: false,
      tierMappingEnabled: false,
    })

    console.log("Result with invalid tools:", result)
    expect(result).toBe("")
  })
})
