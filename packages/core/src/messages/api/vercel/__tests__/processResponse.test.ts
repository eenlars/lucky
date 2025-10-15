import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"

import { describe, expect, it, vi } from "vitest"
import toolResponseMultipleSteps from "../../__tests__/resources/toolResponseMultipleSteps.json"
import toolResponseNoToolUsed from "../../__tests__/resources/toolResponseNoToolUsed.json"
import { processResponseVercel } from "../../processResponse"

// TODO: Mock is incomplete - missing many required environment variables
// Should use a complete mock or test helper
// Mock environment validation
vi.mock("@core/utils/env.mjs", () => ({
  envi: {
    GOOGLE_API_KEY: "mock-key",
    OPENAI_API_KEY: "mock-key",
    SERPAPI_API_KEY: "mock-key",
  },
}))

// TODO: Missing error case tests - what if response is malformed?
// TODO: No tests for edge cases like empty steps array or missing usage data
describe("processModelResponse", () => {
  it("should correctly process a valid tool response with results", async () => {
    // Act
    const result = processResponseVercel({
      response: toolResponseMultipleSteps as any,
      modelUsed: "anthropic/claude-3-haiku-20240307",
      nodeId: "test",
      summary: "test",
    })

    // Assert
    expect(result.type).toBe("tool")
    expect(result).toHaveProperty("agentSteps")
    expect(result).toHaveProperty("cost")

    // Check agentSteps structure - proper typing based on AgentStep interface
    if (result.type === "tool" && result.agentSteps) {
      const agentSteps: AgentSteps = result.agentSteps
      expect(Array.isArray(agentSteps)).toBe(true)
      expect(agentSteps.length).toBeGreaterThan(0)

      // TODO: Only checking first output - should verify all outputs
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

  it("should correctly process a response with no tool usage", async () => {
    // Act
    const result = processResponseVercel({
      response: toolResponseNoToolUsed as any,
      modelUsed: "claude-3-haiku-20240307",
      nodeId: "test",
      summary: "test",
    })

    // Assert - text responses are processed as "text" type with a text AgentStep
    expect(result.type).toBe("text")
    expect(result).toHaveProperty("agentSteps")
    expect(result).toHaveProperty("cost")

    // Check agentSteps structure (should have text output) - proper typing
    if (result.agentSteps) {
      const agentSteps: AgentSteps = result.agentSteps
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
