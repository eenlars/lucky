import type { AgentStep } from "@core/messages/pipeline/AgentStep.types"
import type { ModelName } from "@core/utils/spending/models.types"
import type { LocationData } from "@runtime/schemas/location.types"
import { getDefaultModels } from "@runtime/settings/constants.client"
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

describe("real world data", () => {
  it("should process complex multi-step response from responseMultiple.json", () => {
    const result = processStepsV2(responseMultiple.steps as any, testModel)
    console.log(JSON.stringify(result, null, 2))

    // Should extract tool calls from multiple steps
    expect(result?.agentSteps).toHaveLength(2)

    // First tool call should be searchGoogleMaps
    expect(result?.agentSteps[0].name).toBe("searchGoogleMaps")
    expect(result?.agentSteps[0].args).toEqual({
      query: "Albert Heijn Den Bosch Netherlands",
      result_count: 20,
    })
    // Ensure the tool return is the actual array of places from toolResults
    const firstReturn = result?.agentSteps[0].return as unknown[]
    expect(Array.isArray(firstReturn)).toBe(true)
    expect(firstReturn.length).toBeGreaterThanOrEqual(2)
    expect(firstReturn[0]).toMatchObject({
      address: expect.any(String),
      storeName: expect.any(String),
    })

    // Second tool call should be locationDataManager
    expect(result?.agentSteps[1].name).toBe("locationDataManager")
    const args = result?.agentSteps[1].args as LocationDataManagerArgs
    expect(args.operation).toBe("insertLocations")
    expect(args.workflowInvocationId).toBe("be1472e6")
    expect(Array.isArray(args.locationData)).toBe(true)
    expect(args.locationData).toHaveLength(2)

    // Ensure the second tool return is the array from toolResults as well
    const secondReturn = result?.agentSteps[1].return as unknown[]
    expect(Array.isArray(secondReturn)).toBe(true)
    expect(secondReturn.length).toBeGreaterThanOrEqual(2)
    expect(secondReturn[0]).toMatchObject({
      address: expect.any(String),
      storeName: expect.any(String),
    })

    // Should calculate total cost from usage across steps
    expect(result?.usdCost).toBeGreaterThan(0)
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

    // Only the first step conforms to the supported shape and yields a tool call.
    // The alternative step uses unsupported keys (tool_calls/tool_results) and
    // therefore does not add an agent step.
    expect(result?.agentSteps).toHaveLength(1)
    expect(result?.agentSteps[0].name).toBe("searchGoogleMaps")
  })

  it("should process toolResponseNoToolUsed.json", () => {
    const result = processStepsV2(responseNoToolUsed.steps as any, testModel)
    const expected: AgentStep<unknown> = {
      type: "text",
      name: undefined,
      args: undefined,
      return: "I understand. not possible.",
    }
    expect(result?.agentSteps).toEqual([expected])
    expect(result?.usdCost).toBeGreaterThan(0)
  })
})
