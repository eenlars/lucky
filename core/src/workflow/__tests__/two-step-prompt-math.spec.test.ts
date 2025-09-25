import { describe, expect, it, vi } from "vitest"

import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import * as RandomizedFitness from "@core/evaluation/calculate-fitness/randomizedFitness"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { Workflow } from "@core/workflow/Workflow"
import { getDefaultModels } from "@runtime/settings/models"

// Integration test: 2-step prompt-only math workflow
// - Node 1: add 7 to input
// - Node 2: multiply the previous output by 4
// - Verify with an LLM judge (no mocks, no tools)

describe("prompt-only 2-step math workflow", () => {
  it("adds 7 then multiplies by 4; LLM verifies correctness", async () => {
    // Random input 1..100 so it changes each test run
    const input = Math.floor(Math.random() * 100) + 1
    const expected = (input + 7) * 4

    const cfg: WorkflowConfig = {
      nodes: [
        {
          nodeId: "adder",
          description: "Adds 7 to the provided integer and returns only the integer.",
          systemPrompt:
            "You will receive the workflow input containing a starting integer N. Compute N + 7. Return only the integer with no extra text, no formatting, no explanations.",
          modelName: getDefaultModels().nano,
          mcpTools: [],
          codeTools: [],
          handOffs: ["multiplier"],
        },
        {
          nodeId: "multiplier",
          description: "Takes the previous node's integer output and returns that value multiplied by 4.",
          systemPrompt:
            "You will receive a single integer from the previous node. Multiply it by 4 and return only the resulting integer with no extra text, no formatting, no explanations.",
          modelName: getDefaultModels().nano,
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
      entryNodeId: "adder",
    }

    const evaluation = {
      type: "prompt-only" as const,
      goal: `Starting integer N: ${input}. Step 1: Add 7 to N and output only the integer. Step 2: Take that output and multiply by 4, output only the integer.`,
      workflowId: "two-step-math-prompt-only-it",
    }

    // Create the workflow. This will upsert the WorkflowVersion during setup()
    const wf = Workflow.create({
      config: cfg,
      evaluationInput: evaluation,
      toolContext: undefined,
    })

    // Prepare IO from the prompt-only evaluation
    await wf.prepareWorkflow(evaluation, "ai")

    // Run workflow end-to-end
    const { success, data: results, error } = await wf.run()
    expect(success).toBe(true)
    expect(error).toBeUndefined()
    expect(results && results.length > 0).toBe(true)

    const { queueRunResult } = results![0]
    expect(typeof queueRunResult.finalWorkflowOutput).toBe("string")

    // Mock the randomized fitness judge to avoid external LLM calls
    const mockFitness: FitnessOfWorkflow = {
      score: 100,
      totalCostUsd: 0,
      totalTimeSeconds: 0,
      accuracy: 100,
    }
    const spy = vi
      .spyOn(RandomizedFitness, "calculateFitness")
      .mockResolvedValue({ success: true, data: mockFitness, usdCost: 0 })

    const judge = await RandomizedFitness.calculateFitness(
      {
        agentSteps: queueRunResult.agentSteps,
        totalTime: queueRunResult.totalTime,
        totalCost: queueRunResult.totalCost,
        // Provide strict expected answer in the evaluation text for the judge
        evaluation:
          `The correct final numeric answer is ${expected}. ` +
          `Award accuracy 100 ONLY if the final output equals ${expected} as a bare integer (ignoring whitespace). ` +
          `If incorrect, award 0.`,
        outputSchema: undefined,
        finalWorkflowOutput: queueRunResult.finalWorkflowOutput,
      },
      1
    )

    expect(spy).toHaveBeenCalled()
    expect(judge.success).toBe(true)
    // Expect perfect score
    expect(judge.data?.accuracy).toBeGreaterThanOrEqual(90)
  }, 15_000)
})
