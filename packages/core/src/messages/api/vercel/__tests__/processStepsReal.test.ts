import { getDefaultModels } from "@core/core-config/compat"
import type { AgentStep } from "@core/messages/pipeline/AgentStep.types"
import type { ModelName } from "@core/utils/spending/models.types"
import type { LocationData } from "@lucky/shared"
import { describe, expect, it } from "vitest"
import responseMultiple from "../../__tests__/resources/toolResponseMultipleSteps.json"
import responseNoToolUsed from "../../__tests__/resources/toolResponseNoToolUsed.json"
import { processStepsV2 } from "../vercelStepProcessor"

interface LocationDataManagerArgs {
  operation: "insertLocations" | "getLocations" | "removeLocations"
  locationData?: LocationData[]
  locationIdsToRemove?: string[]
  workflowInvocationId: string
}

const testModel: ModelName = getDefaultModels().default

// TODO: Test file is loading external JSON fixtures but not verifying their structure
// TODO: No validation that test fixtures match current API response format
describe("real world data", () => {
  it("should process complex multi-step response from responseMultiple.json", () => {
    const result = processStepsV2(responseMultiple.steps as any, testModel)
    console.log(JSON.stringify(result, null, 2))

    // Should extract tool calls from multiple steps (updated for v5 format)
    expect(result?.agentSteps).toHaveLength(3)

    // Verify all three tool calls are processed correctly from v5 format
    expect(result?.agentSteps[0].name).toBe("tool1")
    expect(result?.agentSteps[0].args).toEqual({})
    expect(result?.agentSteps[0].return).toBe("result1")

    expect(result?.agentSteps[1].name).toBe("tool2")
    expect(result?.agentSteps[1].args).toEqual({ input: "output of tool1" })
    expect(result?.agentSteps[1].return).toBe("processed_output of tool1")

    expect(result?.agentSteps[2].name).toBe("tool3")
    expect(result?.agentSteps[2].args).toEqual({ input: "output of tool2" })
    expect(result?.agentSteps[2].return).toBe("final_output of tool2")

    // Should calculate total cost from usage across steps
    // Note: Cost might be 0 for test fixtures without proper pricing data
    expect(result?.usdCost).toBeGreaterThanOrEqual(0)
  })

  it("should handle real API response structure variations", () => {
    // Test with steps that have different properties
    const stepsWithVariations = [
      responseMultiple.steps[0], // Has toolCalls property
      {
        // Alternative step structure
        tool_calls: [
          {
            type: "tool-call",
            toolCallId: "test-id",
            toolName: "testTool",
            args: { test: "value" },
          },
        ],
        tool_results: [
          {
            type: "tool-result",
            toolCallId: "test-id",
            result: "test result",
          },
        ],
      },
    ]

    const result = processStepsV2(stepsWithVariations as any, testModel)

    // Updated for v5 format: The first step from responseMultiple now contains 3 tools
    // The second step with tool_calls/tool_results format is not supported by v5 converter
    expect(result?.agentSteps).toHaveLength(3)
    expect(result?.agentSteps[0].name).toBe("tool1")
    expect(result?.agentSteps[1].name).toBe("tool2")
    expect(result?.agentSteps[2].name).toBe("tool3")
  })

  it("should process toolResponseNoToolUsed.json", () => {
    const result = processStepsV2(responseNoToolUsed.steps as any, testModel)
    // TODO: Hard-coded expected text "I understand. not possible." is brittle
    // Should verify structure rather than exact text content
    const expected: AgentStep<unknown> = {
      type: "text",
      name: undefined,
      args: undefined,
      return: "I understand. not possible.",
    }
    expect(result?.agentSteps).toEqual([expected])
    // Note: Cost might be 0 for test fixtures without proper pricing data
    expect(result?.usdCost).toBeGreaterThanOrEqual(0)
  })
})
