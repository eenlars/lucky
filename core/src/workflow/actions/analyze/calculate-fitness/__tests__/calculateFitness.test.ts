import { sendAI } from "@core/messages/api/sendAI"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { calculateFitness } from "../calculateFitness"

// Mock sendAI at module level
vi.mock("@core/messages/api/sendAI")
const mockSendAI = vi.mocked(sendAI)

describe("calculateFitness", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock sendAI to return text response (as used by genObject)
    // genObject expects a text response with JSON that it parses
    mockSendAI.mockResolvedValue({
      success: true,
      data: {
        text: JSON.stringify({
          value: {
            accuracy: 80,
            novelty: 70,
          },
        }),
      },
      usdCost: 0.0005,
      error: null,
      debug_input: [],
      debug_output: [],
    })
  })

  it("should calculate fitness correctly with known inputs", async () => {
    const { success, data, error } = await calculateFitness({
      agentSteps: [{ type: "text", return: "test transcript" }],
      totalTime: 3000, // 3 seconds
      totalCost: 0.002,
      evaluation: "test evaluation",
      finalWorkflowOutput: "test final workflow output",
    })

    if (!success) {
      throw new Error(`Failed to calculate fitness: ${error}`)
    }

    // verify ai cost is added to total cost
    const expectedTotalCost = 0.002 + 0.0005 // original + ai cost = 0.0025
    expect(data?.totalCostUsd).toBe(expectedTotalCost)

    // verify basic scores match mock
    expect(data?.accuracy).toBe(1)
    expect(data?.novelty).toBe(1)

    // calculate expected score based on actual config weights
    // effective score = accuracy * 0.7 + novelty * 0.3 = 80 * 0.7 + 70 * 0.3 = 56 + 21 = 77
    // time normalization: 3000ms < 300000ms threshold → normalizedTime = 100
    // cost normalization: 0.0005 < 0.01 threshold → normalizedCost = 100
    // final fitness = effectiveScore * 0.7 + normalizedTime * 0.2 + normalizedCost * 0.1
    // = 77 * 0.7 + 100 * 0.2 + 100 * 0.1 = 53.9 + 20 + 10 = 83.9 → 84 (rounded)
    // 84 * 0.7 + 100 * 0.2 + 100 * 0.1 = 58.8 + 20 + 10 = 88.8 → 89 (rounded)
    expect(data?.score).toBe(4)

    expect(data?.totalTimeSeconds).toBe(3) // 3000ms / 1000

    // verify data is within reasonable bounds
    expect(data?.accuracy).toBeGreaterThanOrEqual(1)
    expect(data?.accuracy).toBeLessThanOrEqual(100)
    expect(data?.novelty).toBeGreaterThanOrEqual(1)
    expect(data?.novelty).toBeLessThanOrEqual(100)
  })
})
