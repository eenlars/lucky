import type { AgentSteps } from "@core/messages/types/AgentStep.types"
import type { ModelName } from "@core/utils/spending/models.types"
import { describe, expect, it, vi } from "vitest"
import { processModelResponse } from "../processResponse"
import toolResponseMultipleSteps from "./resources/toolResponseMultipleSteps.json"
import toolResponseNoToolUsed from "./resources/toolResponseNoToolUsed.json"

// Mock environment validation
vi.mock("@core/utils/env.mjs", () => ({
  envi: {
    GOOGLE_API_KEY: "mock-key",
    OPENAI_API_KEY: "mock-key",
    SERPAPI_API_KEY: "mock-key",
  },
}))

describe("processModelResponse", () => {
  it("should correctly process a valid tool response with results", () => {
    // Act
    const result = processModelResponse({
      response: toolResponseMultipleSteps as any,
      modelUsed: "claude-3-haiku-20240307" as unknown as ModelName,
      nodeId: "test",
    })

    // Assert
    expect(result.type).toBe("tool")
    expect(result).toHaveProperty("agentSteps")
    expect(result).toHaveProperty("cost")

    // Check agentSteps structure - proper typing based on AgentStep interface
    if (result.type === "tool" && result.agentSteps) {
      const agentSteps: AgentSteps = result.agentSteps
      expect(agentSteps).toHaveProperty("outputs")
      expect(agentSteps).toHaveProperty("totalCost")
      expect(Array.isArray(agentSteps)).toBe(true)
      expect(agentSteps.length).toBeGreaterThan(0)

      // Check first output structure - correct property names per NodeLog interface
      const firstOutput = agentSteps[0]
      expect(firstOutput).toHaveProperty("type", "tool")
      if (firstOutput.type === "tool") {
        expect(firstOutput).toHaveProperty("name")
        expect(firstOutput).toHaveProperty("args")
        expect(firstOutput).toHaveProperty("return")
      }
    }
  })

  it("should correctly process a response with no tool usage", () => {
    // Act
    const result = processModelResponse({
      response: toolResponseNoToolUsed as any,
      modelUsed: "claude-3-haiku-20240307" as unknown as ModelName,
      nodeId: "test",
    })

    // Assert - text responses are processed as tool type with text NodeLog
    expect(result.type).toBe("tool")
    expect(result).toHaveProperty("agentSteps")
    expect(result).toHaveProperty("cost")

    // Check agentSteps structure (should have text output) - proper typing
    if (result.agentSteps) {
      const agentSteps: AgentSteps = result.agentSteps
      expect(agentSteps).toHaveProperty("totalCost")
      expect(Array.isArray(agentSteps)).toBe(true)
      expect(agentSteps.length).toBe(1)

      // Check the text output structure - correct property names per NodeLog interface
      const textOutput = agentSteps[0]
      expect(textOutput).toHaveProperty("type", "text")
      if (textOutput.type === "text") {
        expect(textOutput.name).toBeUndefined()
        expect(textOutput.args).toBeUndefined()
        expect(textOutput).toHaveProperty("return")
        expect(typeof textOutput.return).toBe("string")
      }
    }
  })
})
