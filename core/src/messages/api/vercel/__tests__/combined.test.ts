import { getFinalOutputNodeInvocation } from "@core/messages/api/processResponse"
import { calculateUsageCost } from "@core/messages/api/vercel/pricing/vercelUsage"
import type { ModelName } from "@core/utils/spending/models.types"
import { getDefaultModels } from "@runtime/settings/constants.client"
import { responseToAgentSteps } from "../responseToAgentSteps"
import multiOutput from "./resources/multiOutput.json"

// TODO: Test file name says "combined" but only tests vercel integration
// TODO: Missing tests for error cases and edge conditions
describe("vercel.integration.test", () => {
  const testModel: ModelName = getDefaultModels().default

  it("should process multiOutput.json: aggregate tool steps and compute cost deterministically", async () => {
    const { agentSteps, usdCost } = responseToAgentSteps({
      response: multiOutput as any,
      modelUsed: testModel,
      nodeId: "test",
      summary: "test",
    })

    // Structure: 3 tool steps, correct order, names, args, and returns
    expect(agentSteps.length).toBe(3)
    for (const step of agentSteps) expect(step.type).toBe("tool")

    const expectedReturns = ["sample input", "random input", "another example"]
    const expectedArgs = (multiOutput as any).steps.map(
      (s: any) => s.toolCalls[0].args
    )

    expect(agentSteps.map((s: any) => s.name)).toEqual([
      "testTool",
      "testTool",
      "testTool",
    ])
    expect(agentSteps.map((s: any) => s.return)).toEqual(expectedReturns)
    expect(agentSteps.map((s: any) => s.args)).toEqual(expectedArgs)

    // Final output should be the last tool return
    expect(getFinalOutputNodeInvocation(agentSteps as any)).toBe(
      "another example"
    )

    // Cost should equal both: (a) sum of per-step usage, and (b) top-level usage
    const perStepCost = ((multiOutput as any).steps as any[])
      .map((s) => calculateUsageCost(s.usage, testModel))
      .reduce((a, b) => a + b, 0)
    const topLevelCost = calculateUsageCost(
      (multiOutput as any).usage,
      testModel
    )

    // TODO: This assertion assumes test fixtures use same model as default
    // Test will break if default model changes
    // Ensure model alignment with fixture to avoid drift
    expect(testModel).toBe((multiOutput as any).response.modelId)

    // TODO: Testing cost calculation to 8 decimal places is overly precise
    // Costs can vary slightly - use more reasonable precision (4-5 decimals)
    expect(usdCost).toBeCloseTo(perStepCost, 8)
    expect(usdCost).toBeCloseTo(topLevelCost, 8)
  })

  it("should fallback to a single text step when no tool calls exist", async () => {
    const textOnly = {
      text: "just text",
      steps: [],
      usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
    }

    const { agentSteps, usdCost } = responseToAgentSteps({
      response: textOnly as any,
      modelUsed: testModel,
      nodeId: "test",
      summary: "test",
    })

    expect(agentSteps.length).toBe(1)
    expect(agentSteps[0]).toMatchObject({ type: "text", return: "just text" })
    expect(getFinalOutputNodeInvocation(agentSteps as any)).toBe("just text")

    const expectedCost = calculateUsageCost(textOnly.usage, testModel)
    expect(usdCost).toBeCloseTo(expectedCost, 8)
  })
})
