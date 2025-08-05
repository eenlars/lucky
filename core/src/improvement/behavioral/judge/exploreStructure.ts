import { sendAI } from "@core/messages/api/sendAI"
import { SharedWorkflowPrompts } from "@core/prompts/workflowAnalysisPrompts"
import { R, type RS } from "@core/utils/types"
import type { FitnessOfWorkflow } from "@core/workflow/actions/analyze/calculate-fitness/fitness.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { MODELS } from "@runtime/settings/constants"
import z from "zod"

export interface StructureExplorationResult {
  recommendedStructure: string
  structuralReason: string
  shouldImplement: boolean
}

export async function exploreStructure(
  workflow: WorkflowConfig,
  feedback: string,
  fitness: FitnessOfWorkflow
): Promise<RS<StructureExplorationResult>> {
  const randomWorkflowStructure =
    SharedWorkflowPrompts.randomWorkflowStructure()

  const systemPrompt = `You are an expert workflow structure analyst. Your role is to evaluate if a specific workflow structure pattern would improve the current workflow.

You must analyze the current workflow and decide if implementing the suggested structure pattern would be beneficial.

The structure pattern to evaluate: ${randomWorkflowStructure}

IMPORTANT PRINCIPLES:
- Focus on structural improvements that could enhance workflow performance
- Consider if the suggested pattern addresses current bottlenecks
- Evaluate if the pattern would improve parallelism, validation, or processing flow
- Only recommend implementation if it would meaningfully improve the workflow`

  const userPrompt = `Analyze this workflow and decide if implementing the suggested structure pattern would improve it.

CURRENT WORKFLOW CONFIG (JSON):
${JSON.stringify(workflow, null, 2)}

FITNESS:
${JSON.stringify(feedback ?? "No feedback available", null, 2)}
${
  fitness
    ? `
FITNESS METRICS:
- Score: ${fitness.score}/100
- Total Cost: $${fitness.totalCostUsd.toFixed(2)}
- Total Time: ${fitness.totalTimeSeconds}s
- Data Accuracy: ${fitness.accuracy}
`
    : ""
}

STRUCTURE PATTERN TO EVALUATE: ${randomWorkflowStructure}

TASK:
Evaluate if implementing this structural pattern would improve the workflow:
- Would this pattern address current bottlenecks?
- Would it improve performance, accuracy, or efficiency?
- How could this pattern be implemented in the current workflow?
- Should we recommend implementing this structure?

Return your analysis with a clear recommendation.`

  const response = await sendAI({
    model: MODELS.reasoning,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    mode: "structured",
    schema: z.object({
      shouldImplement: z
        .boolean()
        .describe(
          "Whether implementing this structure pattern would improve the workflow"
        ),
      recommendedStructure: z
        .string()
        .describe("The structure pattern that was evaluated"),
      structuralReason: z
        .string()
        .describe(
          "Detailed explanation of why this structure would or would not improve the workflow"
        ),
    }),
  })

  if (!response.success || !response.data) {
    return R.error(
      response.error ||
        "Failed to get response from AI during structure exploration",
      response.usdCost
    )
  }

  return R.success(
    {
      recommendedStructure: response.data.recommendedStructure,
      structuralReason: response.data.structuralReason,
      shouldImplement: response.data.shouldImplement,
    },
    response.usdCost
  )
}
