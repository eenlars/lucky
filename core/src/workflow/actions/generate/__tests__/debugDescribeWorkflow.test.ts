import type { Workflow } from "@core/workflow/Workflow"
import { describe, expect, it, vi } from "vitest"
import { explainSubsetOfTools } from "../../../../prompts/explainTools"
import { workflowToString } from "../workflowToString"

// Mock the tool types to include the test tools
vi.mock("@core/tools/tool.types", () => ({
  ALL_ACTIVE_TOOL_NAMES: ["browserUse", "csvInfo", "searchGoogleMaps", "verifyLocation"],
  ACTIVE_TOOLS_WITH_DESCRIPTION: {
    browserUse: "Use a browser to navigate to a URL and return the HTML",
    csvInfo: "Get CSV file metadata: headers, column count, row count, data types, sample values",
    searchGoogleMaps: "Search Google Maps for business information",
    verifyLocation: "Geocode a list of addresses to get coordinates",
  },
}))

describe("Debug describeWorkflow", () => {
  it("should test explainSubsetOfTools directly", () => {
    const tools = ["browserUse", "csvInfo"]
    const result = explainSubsetOfTools(tools)
    console.log("Direct explainSubsetOfTools result:", result)
    console.log("Result length:", result.length)
    expect(result).toContain("browserUse")
    expect(result).toContain("csvInfo")
  })

  it("should test describeWorkflow step by step", () => {
    const mockWorkflow = {
      getConfig: () => {
        const config = {
          nodes: [
            {
              id: "node1",
              systemPrompt: "Test prompt",
              mcpTools: ["browserUse"],
              codeTools: ["csvInfo"],
              handoffs: [],
            },
          ],
          model: "test-model",
        }
        return config
      },
    } as unknown as Workflow

    // Test extracting tools from workflow
    const config = mockWorkflow.getConfig()
    const allTools = config.nodes.flatMap(node => [...node.mcpTools, ...node.codeTools])
    console.log("All tools from workflow:", allTools)

    // Test with only tool explanations
    const result = workflowToString(mockWorkflow, {
      includeToolExplanations: true,
      includeAdjacencyList: false,
      includeAgents: false,
      easyModelNames: false,
    })

    console.log("Full describeWorkflow result:")
    console.log(result)
    console.log("Result length:", result.length)

    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThan(0)
  })
})
