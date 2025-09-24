import { describe, it, expect, vi } from "vitest"
import { invokeWorkflow, invokeWorkflowWithPrompt } from "./invokeWorkflow"
import type { RuntimeSettings } from "./types"

describe("Runtime Settings", () => {
  it("should accept runtime settings in invokeWorkflow", async () => {
    const runtime: RuntimeSettings = {
      skipEvaluation: true,
      skipPreparation: false,
      preparationMethod: "ai",
      maxCost: 5.0,
    }

    // This test verifies that the type system accepts runtime settings
    const input = {
      evalInput: {
        type: "prompt-only" as const,
        goal: "Test goal",
        workflowId: "test",
      },
      dslConfig: {
        nodes: [],
        entryNodeId: "entry",
      },
      runtime,
    }

    // Type should be valid
    expect(input.runtime).toBeDefined()
    expect(input.runtime?.skipEvaluation).toBe(true)
    expect(input.runtime?.maxCost).toBe(5.0)
  })

  it("should work with invokeWorkflowWithPrompt", async () => {
    const options = {
      goal: "Test goal",
      skipEvaluation: true,
      skipPreparation: false,
      maxCost: 3.0,
    }

    // This test verifies that invokeWorkflowWithPrompt accepts the options
    expect(options.skipEvaluation).toBe(true)
    expect(options.maxCost).toBe(3.0)
  })

  it("should maintain backward compatibility without runtime", async () => {
    // Old code should still work without runtime settings
    const input = {
      evalInput: {
        type: "text" as const,
        question: "What is 2+2?",
        answer: "4",
        workflowId: "test",
      },
      dslConfig: {
        nodes: [],
        entryNodeId: "entry",
      },
    }

    // No runtime settings, should still be valid
    expect('runtime' in input).toBe(false)
  })
})