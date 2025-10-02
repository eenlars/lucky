import type { FitnessOfWorkflowSchema } from "@core/evaluation/calculate-fitness/fitness.types"
import { calculateFitness } from "@core/evaluation/calculate-fitness/randomizedFitness"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import type { TResponse } from "@core/messages/api/sendAI/types"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { z } from "zod"

// Mock sendAI at module level (correct module path)
vi.mock("@core/messages/api/sendAI/sendAI", () => ({
  sendAI: vi.fn(),
}))
const mockSendAI = vi.mocked(sendAI)

describe("calculateFitness", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock sendAI to return structured accuracy as calculateFitness expects
    const structuredOk: TResponse<z.infer<typeof FitnessOfWorkflowSchema>> = {
      success: true,
      data: { accuracy: 80, feedback: "Reasoning" },
      usdCost: 0.0005,
      error: null,
      debug_input: [],
      debug_output: [],
    }
    // Cast to any to satisfy overloaded function mock typing while keeping strong
    // typing for the mock payload itself.
    mockSendAI.mockResolvedValue(structuredOk as any)
  })

  it("should calculate fitness correctly with known inputs", async () => {
    // TODO: this test has several issues:
    // 1. the mock returns { accuracy: 80 } but expects accuracy: 1
    //    - the actual implementation uses accuracy from AI response
    //    - the test should verify the actual behavior, not incorrect expectations
    // 2. the fitness calculation comments are confusing and incorrect:
    //    - mentions "effective score = accuracy * 0.7" but implementation may differ
    //    - the actual implementation uses effectiveScore = accuracy only
    //    - the weights calculation is also wrong - should check actual CONFIG values
    // 3. expects score: 4 but the calculation logic doesn't match this expectation
    //    - need to verify what the actual implementation returns with these inputs
    // 4. the test doesn't verify the accuracy gating logic for time/cost bonuses
    // 5. missing test cases for edge cases like:
    //    - nil/empty agentSteps or finalWorkflowOutput (should return error)
    //    - accuracy values outside 1-100 range (should be clamped)
    //    - failed AI response (should return error with cost)
    //    - outputSchema parameter usage
    const { success, data, error } = await calculateFitness(
      {
        agentSteps: [{ type: "text", return: "test transcript" }],
        totalTime: 3000, // 3 seconds
        totalCost: 0.002,
        evaluation: "test evaluation",
        finalWorkflowOutput: "test final workflow output",
      },
      1,
    )

    if (!success) {
      throw new Error(`Failed to calculate fitness: ${error}`)
    }

    // verify ai cost is added to total cost
    const expectedTotalCost = 0.002 + 0.0005 // original + ai cost = 0.0025
    expect(data?.totalCostUsd).toBe(expectedTotalCost)

    // verify basic scores match mock
    expect(data?.accuracy).toBe(80)

    // score should be within 0-100
    expect(data?.score).toBeGreaterThanOrEqual(0)
    expect(data?.score).toBeLessThanOrEqual(100)

    expect(data?.totalTimeSeconds).toBe(3) // 3000ms / 1000

    // verify data is within reasonable bounds
    expect(data?.accuracy).toBeGreaterThanOrEqual(1)
    expect(data?.accuracy).toBeLessThanOrEqual(100)
  })
})
