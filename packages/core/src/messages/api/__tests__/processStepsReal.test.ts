import type { NodeLogs } from "@messages/api/processResponse"
import { type ModelName } from "@utils/models/models"
import type { LocationData } from "@example/code_tools/mapbox/mapboxUse"
import { getModels } from "@utils/config/runtimeConfig"
import { describe, expect, it } from "vitest"
import { processStepsV2 } from "../stepProcessor"
import responseMultiple from "./resources/toolResponseMultipleSteps.json"
import responseNoToolUsed from "./resources/toolResponseNoToolUsed.json"

interface LocationDataManagerArgs {
  operation: "insertLocations" | "getLocations" | "removeLocations"
  locationData?: LocationData[]
  locationIdsToRemove?: string[]
  workflowInvocationId: string
}

const testModel: ModelName = getModels().default

describe("real world data", () => {
  it("should process complex multi-step response from responseMultiple.json", () => {
    const result = processStepsV2(responseMultiple.steps as any, testModel)
    console.log(JSON.stringify(result, null, 2))

    // Should extract tool calls from multiple steps
    expect(result?.outputs).toHaveLength(2)

    // First tool call should be searchGoogleMaps
    expect(result?.outputs[0].name).toBe("searchGoogleMaps")
    expect(result?.outputs[0].args).toEqual({
      query: "Albert Heijn Den Bosch Netherlands",
      result_count: 20,
    })
    expect(result?.outputs[0].return).toBeDefined()

    // Second tool call should be locationDataManager
    expect(result?.outputs[1].name).toBe("locationDataManager")
    const args = result?.outputs[1].args as LocationDataManagerArgs
    expect(args.operation).toBe("insertLocations")
    expect(args.workflowInvocationId).toBe("be1472e6")
    expect(Array.isArray(args.locationData)).toBe(true)
    expect(args.locationData).toHaveLength(2)

    // Should calculate total cost from usage across steps
    expect(result?.totalCost).toBeGreaterThan(0)
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

    expect(result?.outputs).toHaveLength(2)
    expect(result?.outputs[0].name).toBe("searchGoogleMaps")
    expect(result?.outputs[1].name).toBe("testTool")
  })

  it("should process toolResponseNoToolUsed.json", () => {
    const result = processStepsV2(responseNoToolUsed.steps as any, testModel)
    const expected: NodeLogs = {
      outputs: [
        {
          type: "text",
          name: undefined,
          args: undefined,
          return: "I understand. not possible.",
        },
      ],
      totalCost: 0.0002904,
    }
    expect(result).toEqual(expected)
  })
})
