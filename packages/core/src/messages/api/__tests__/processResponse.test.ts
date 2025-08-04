import { MODELS } from "@/runtime/settings/constants"
import { describe, expect, it } from "vitest"
import { processModelResponse } from "../processResponse"
import toolResponseMultipleSteps from "./resources/toolResponseMultipleSteps.json" assert { type: "json" }
import toolResponseNoToolUsed from "./resources/toolResponseNoToolUsed.json" assert { type: "json" }

describe("processModelResponse", () => {
  // FAILING: Test expects toolName/toolArgs properties but processStepsV2 outputs name/args properties instead
  it("should correctly process a valid tool response with results", () => {
    // Arrange
    const response = toolResponseMultipleSteps as any

    // Act
    const result = processModelResponse({
      response,
      modelUsed: MODELS.nano,
      nodeId: "test",
    })

    // Assert
    expect(result.type).toBe("tool")
    expect(result).toHaveProperty("toolUsage")
    expect(result).toHaveProperty("cost")

    // Check toolUsage structure
    const toolUsage = (result as any).toolUsage
    expect(toolUsage).toHaveProperty("outputs")
    expect(toolUsage).toHaveProperty("totalCost")
    expect(Array.isArray(toolUsage.outputs)).toBe(true)
    expect(toolUsage.outputs.length).toBeGreaterThan(0)

    // Check first output structure
    const firstOutput = toolUsage.outputs[0]
    expect(firstOutput).toHaveProperty("type", "tool")
    expect(firstOutput).toHaveProperty("toolName")
    expect(firstOutput).toHaveProperty("toolArgs")
    expect(firstOutput).toHaveProperty("toolResponse")
  })

  // FAILING: Test expects toolName/toolArgs properties but processStepsV2 outputs name/args with different property names
  it("should correctly process a response with no tool usage", () => {
    // Arrange
    const response = toolResponseNoToolUsed as any

    // Act
    const result = processModelResponse({
      response,
      modelUsed: MODELS.nano,
      nodeId: "test",
    })

    // Assert
    expect(result.type).toBe("tool")
    expect(result).toHaveProperty("toolUsage")
    expect(result).toHaveProperty("cost")

    // Check toolUsage structure (should have text output)
    const toolUsage = (result as any).toolUsage
    expect(toolUsage).toHaveProperty("outputs")
    expect(toolUsage).toHaveProperty("totalCost")
    expect(Array.isArray(toolUsage.outputs)).toBe(true)
    expect(toolUsage.outputs.length).toBe(1)

    // Check the text output structure
    const textOutput = toolUsage.outputs[0]
    expect(textOutput).toHaveProperty("type", "text")
    expect(textOutput).toHaveProperty("toolName", undefined)
    expect(textOutput).toHaveProperty("toolArgs", undefined)
    expect(textOutput).toHaveProperty("toolResponse")
    expect(typeof textOutput.toolResponse).toBe("string")
  })
})
