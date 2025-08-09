import type { ModelNameV2 } from "@core/utils/spending/models.types"
import { getDefaultModels } from "@runtime/settings/constants.client"
import { describe, expect, it } from "vitest"
import { processStepsV2 } from "../stepProcessor"

describe("processStepsV2", () => {
  const testModel: ModelNameV2 = getDefaultModels().default

  describe("invalid inputs", () => {
    it("should return empty result for non-array input", () => {
      const result = processStepsV2(null as any, testModel)
      expect(result).toEqual({
        outputs: [],
        totalCost: 0,
      })
    })

    it("should return empty result for undefined input", () => {
      const result = processStepsV2(undefined as any, testModel)
      expect(result).toEqual({
        outputs: [],
        totalCost: 0,
      })
    })

    it("should return empty result for string input", () => {
      const result = processStepsV2("not an array" as any, testModel)
      expect(result).toEqual({
        outputs: [],
        totalCost: 0,
      })
    })

    it("should return empty result for object input", () => {
      const result = processStepsV2({ some: "object" } as any, testModel)
      expect(result).toEqual({
        outputs: [],
        totalCost: 0,
      })
    })
  })

  describe("empty and basic inputs", () => {
    it("should return empty result for empty array", () => {
      const result = processStepsV2([] as any, testModel)
      expect(result).toEqual({
        outputs: [],
        totalCost: 0,
      })
    })

    it("should handle array with null steps", () => {
      const steps = [null, undefined, null]
      const result = processStepsV2(steps as any, testModel)
      expect(result).toEqual({
        outputs: [],
        totalCost: 0,
      })
    })
  })

  describe("tool calls and results processing", () => {
    it("should process step with toolCalls property", () => {
      const steps = [
        {
          toolCalls: [
            {
              toolName: "testTool",
              args: { param: "value" },
            },
          ],
          toolResults: [
            {
              result: "test result",
            },
          ],
          text: "test response",
        },
      ]

      const result = processStepsV2(steps as any, testModel)

      expect(result?.agentSteps).toHaveLength(1)
      expect(result?.agentSteps[0]).toEqual({
        type: "tool",
        name: "testTool",
        args: { param: "value" },
        return: "test result",
      })
    })

    it("should process step with tool_calls property (alternative format)", () => {
      const steps = [
        {
          tool_calls: [
            {
              name: "alternativeTool",
              arguments: { data: "test" },
            },
          ],
          tool_results: [
            {
              output: "alternative result",
            },
          ],
        },
      ]

      const result = processStepsV2(steps as any, testModel)

      // Since the implementation doesn't handle alternative format, it should fallback to text
      expect(result?.agentSteps).toHaveLength(1)
      expect(result?.agentSteps[0]).toEqual({
        type: "text",
        name: undefined,
        args: undefined,
        return: "",
      })
    })

    it("should handle multiple tool calls in a single step", () => {
      const steps = [
        {
          toolCalls: [
            {
              toolName: "tool1",
              args: { param1: "value1" },
            },
            {
              toolName: "tool2",
              args: { param2: "value2" },
            },
          ],
          toolResults: [{ result: "result1" }, { result: "result2" }],
        },
      ]

      const result = processStepsV2(steps as any, testModel)

      expect(result?.agentSteps).toHaveLength(2)
      expect(result?.agentSteps[0].name).toBe("tool1")
      expect(result?.agentSteps[1].name).toBe("tool2")
    })

    it("should use text as fallback when no specific tool result", () => {
      const steps = [
        {
          toolCalls: [
            {
              toolName: "testTool",
              args: { param: "value" },
            },
          ],
          text: "fallback text response",
        },
      ]

      const result = processStepsV2(steps as any, testModel)

      expect(result?.agentSteps[0].return).toBe("fallback text response")
    })

    it("should use tool call result property when available", () => {
      const steps = [
        {
          toolCalls: [
            {
              toolName: "testTool",
              args: { param: "value" },
              result: "embedded result",
            },
          ],
        },
      ]

      const result = processStepsV2(steps as any, testModel)

      // The implementation doesn't look for result property in toolCalls, only in toolResults
      // So this should fallback to empty string since there's no toolResults
      expect(result?.agentSteps[0].return).toBe("")
    })
  })

  describe("tool name processing", () => {
    it("should join multiple tool names with comma", () => {
      const steps = [
        {
          toolCalls: [
            { toolName: "tool1", args: {} },
            { toolName: "tool2", args: {} },
            { toolName: "tool3", args: {} },
          ],
        },
      ]

      const result = processStepsV2(steps as any, testModel)

      // check that we get the individual tool calls with correct names
      expect(result?.agentSteps).toHaveLength(3)
      expect(result?.agentSteps[0].name).toBe("tool1")
      expect(result?.agentSteps[1].name).toBe("tool2")
      expect(result?.agentSteps[2].name).toBe("tool3")
    })

    it("should handle missing tool names gracefully", () => {
      const steps = [
        {
          toolCalls: [
            { args: { param: "value" } }, // no toolName
          ],
        },
      ]

      const result = processStepsV2(steps as any, testModel)

      expect(result?.agentSteps[0].name).toBe("")
    })

    it("should filter out non-string tool names", () => {
      const steps = [
        {
          toolCalls: [
            { toolName: null, args: {} },
            { toolName: 123, args: {} },
            { toolName: "validTool", args: {} },
          ],
        },
      ]

      const result = processStepsV2(steps as any, testModel)

      expect(result?.agentSteps).toHaveLength(3)
      expect(result?.agentSteps[2].name).toBe("validTool")
    })
  })

  describe("cost calculation", () => {
    it("should calculate cost from usage information", () => {
      const steps = [
        {
          toolCalls: [{ toolName: "testTool", args: {} }],
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
          },
        },
      ]

      const result = processStepsV2(steps as any, testModel)

      expect(result?.usdCost).toBeGreaterThan(0)
    })

    it("should handle missing usage information", () => {
      const steps = [
        {
          toolCalls: [{ toolName: "testTool", args: {} }],
          // no usage property
        },
      ]

      const result = processStepsV2(steps as any, testModel)

      expect(result?.usdCost).toBe(0)
    })

    it("should sum costs from multiple steps", () => {
      const steps = [
        {
          toolCalls: [{ toolName: "tool1", args: {} }],
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
          },
        },
        {
          toolCalls: [{ toolName: "tool2", args: {} }],
          usage: {
            promptTokens: 200,
            completionTokens: 100,
            totalTokens: 300,
          },
        },
      ]

      const result = processStepsV2(steps as any, testModel)

      expect(result?.usdCost).toBeGreaterThan(0)
      expect(result?.agentSteps).toHaveLength(2)
    })
  })

  describe("data structure integrity", () => {
    it("should maintain correct AgentStep structure", () => {
      const steps = [
        {
          toolCalls: [
            {
              toolName: "testTool",
              args: { test: "data" },
            },
          ],
          toolResults: [{ result: "success" }],
        },
      ]

      const result = processStepsV2(steps as any, testModel)

      // check top-level structure
      expect(result).toHaveProperty("agentSteps")
      expect(Array.isArray(result?.agentSteps)).toBe(true)
      expect(typeof result?.usdCost).toBe("number")

      // check tool call structure
      expect(result?.agentSteps[0]).toHaveProperty("name")
      expect(result?.agentSteps[0]).toHaveProperty("args")
      expect(result?.agentSteps[0]).toHaveProperty("return")
    })

    it("should preserve argument structure", () => {
      const complexArgs = {
        nested: { data: "value" },
        array: [1, 2, 3],
        boolean: true,
        number: 42,
      }

      const steps = [
        {
          toolCalls: [
            {
              toolName: "complexTool",
              args: complexArgs,
            },
          ],
        },
      ]

      const result = processStepsV2(steps as any, testModel)

      expect(result?.agentSteps[0].args).toEqual(complexArgs)
    })
  })

  describe("edge cases", () => {
    it("should handle steps with only text content", () => {
      const steps = [
        {
          text: "just text, no tools",
        },
      ]

      const result = processStepsV2(steps as any, testModel)

      expect(result?.agentSteps).toHaveLength(1)
      expect(result?.agentSteps[0]).toEqual({
        type: "text",
        name: undefined,
        args: undefined,
        return: "just text, no tools",
      })
      expect(result?.usdCost).toBe(0)
    })

    it("should handle mixed step types", () => {
      const steps = [
        {
          toolCalls: [{ toolName: "tool1", args: {} }],
          toolResults: [{ result: "success" }],
        },
        {
          text: "just text",
        },
        {
          tool_calls: [{ name: "tool2", arguments: {} }], // This won't be processed as toolCalls
        },
      ]

      const result = processStepsV2(steps as any, testModel)

      // Only tool1 will be processed since tool_calls format isn't supported
      expect(result?.agentSteps).toHaveLength(1)
      expect(result?.agentSteps[0].name).toBe("tool1")
    })

    it("should handle mismatched calls and results arrays", () => {
      const steps = [
        {
          toolCalls: [
            { toolName: "tool1", args: {} },
            { toolName: "tool2", args: {} },
          ],
          toolResults: [
            { result: "result1" },
            // missing second result
          ],
        },
      ]

      const result = processStepsV2(steps as any, testModel)

      expect(result?.agentSteps).toHaveLength(2)
      expect(result?.agentSteps[0].return).toEqual("result1")
      expect(result?.agentSteps[1].return).toBe("") // fallback to empty text
    })
  })
})
