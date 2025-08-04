import { sendAI } from "@/messages/api/sendAI"
import { JSONN } from "@/utils/file-types/json/jsonParse"
import { lgg } from "@/utils/logging/Logger"
import { IngestionLayer } from "@/workflow/ingestion/IngestionLayer"
import type {
  EvaluationInput,
  WorkflowIO,
} from "@/workflow/ingestion/ingestion.types"
import type { InvocationInput } from "@/workflow/runner/invokeWorkflow"
import { invokeWorkflow } from "@/workflow/runner/invokeWorkflow"
import { CONFIG, MODELS } from "@/runtime/settings/constants"
import { z } from "zod"

const ProblemAnalysisSchema = z.object({
  problemAnalysis: z.string().describe(
    `The problem analysis of the workflow input 
      The expected boundaries of the workflow input. 
      The edge cases of the workflow input. 
      The difficulty level of the workflow input.
      The assumptions of the workflow input.
      The reasoning of the problem analysis.
      The expected output of the workflow input.
      `
  ),
  instructionsToNodes: z
    .string()
    .describe(
      `to keep it more simple and concise, you need to think about the main goal of the workflow and the instructions to the nodes. make it concise and to the point. it needs to be clear.`
    ),
})

export const prepareProblem = async (
  task: EvaluationInput
): Promise<{
  newGoal: string
  workflowIO: WorkflowIO[]
  problemAnalysis: string
}> => {
  lgg.info("[prepareProblem] Processing evaluation input", {
    type: task.type,
    goal: task.goal,
    question: task.type === "text" ? task.question : undefined,
    method: CONFIG.workflow.prepareProblemMethod,
  })

  // New workflow invocation method
  if (CONFIG.workflow.prepareProblemMethod === "workflow") {
    lgg.info(
      "[prepareProblem] Using workflow version ID for problem analysis",
      {
        workflowVersionId: CONFIG.workflow.prepareProblemWorkflowVersionId,
      }
    )

    // Get the basic conversion from IngestionLayer
    const basicWorkflowIO = await IngestionLayer.convert(task)

    // Invoke the workflow with the specified version ID
    const invocationInput: InvocationInput = {
      workflowVersionId: CONFIG.workflow.prepareProblemWorkflowVersionId,
      evalInput: {
        type: "prompt-only",
        goal: task.goal,
        workflowId: task.workflowId,
      },
    }

    try {
      const result = await invokeWorkflow(invocationInput)

      if (result.success && result.data && result.data.length > 0) {
        const workflowResult = result.data[0]

        lgg.info("[prepareProblem] Workflow invocation successful", {
          cost: workflowResult.usdCost,
          outputMessage: workflowResult.outputMessage?.slice(0, 100) + "...",
        })

        return {
          newGoal: task.goal, // Return original goal as requested
          workflowIO: basicWorkflowIO, // Return basicWorkflowIO as requested
          problemAnalysis:
            workflowResult.outputMessage || "No analysis provided", // Return new problem analysis
        }
      } else {
        lgg.warn(
          "[prepareProblem] Workflow invocation failed, falling back to AI method",
          {
            error: result.error,
          }
        )
        // Fall through to AI method
      }
    } catch (error) {
      lgg.error(
        "[prepareProblem] Workflow invocation error, falling back to AI method",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      )
      // Fall through to AI method
    }
  }

  // Original AI-based method (fallback or when method === "ai")
  lgg.info("[prepareProblem] Using AI enhancement method")

  // First, get the basic conversion from IngestionLayer
  const basicWorkflowIO = await IngestionLayer.convert(task)

  // Use AI to enhance and analyze the problem
  // get some random sample values of the workflowIO, so we can see the boundaries of the training input.
  const sampleWorkflowIO = basicWorkflowIO
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)
    .map((w) => w.workflowInput)

  const sampleWorkflowIOString = sampleWorkflowIO.join("\n")

  const samplesExplanation = `
    This is a sample of the workflow input: ${sampleWorkflowIOString}${sampleWorkflowIOString.length > 1 ? "" : `it is a list of 5 random workflow inputs from a list of ${basicWorkflowIO.length} workflow inputs`}.
  So, this is not representative of the entire input, but you can reason about the boundaries of the input.
  `

  const systemPrompt = `You are an expert problem analyst. 
          Your task is to analyze and enhance workflow inputs to ensure they are well-structured and comprehensive for AI processing.

Your role:
1. Analyze the given input for clarity and completeness
2. Add contextual enhancements that would help an AI system better understand the problem
3. Assess the difficulty level
4. Provide reasoning about the problem structure

Guidelines:
- Preserve the original intent and requirements
- Add clarifying context where needed
- Ensure the input is actionable and specific
- Consider what additional information would be helpful for problem-solving`

  // send a request to the AI to get the boundaries of the training input.
  const { data, success, error, usdCost } = await sendAI({
    mode: "structured",
    schema: ProblemAnalysisSchema,
    model: MODELS.high,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Please analyze this workflow input to the very best of your ability:

Original Goal: ${task.goal}
Input Type: ${task.type}

${sampleWorkflowIO.length > 1 ? samplesExplanation : ""}
`,
      },
    ],
    retries: 2,
  })

  if (!success || !data) {
    lgg.warn(`[prepareProblem] AI enhancement failed: ${error}`, { usdCost })
    // Fall back to original if AI processing fails
    return {
      newGoal: task.goal,
      workflowIO: basicWorkflowIO,
      problemAnalysis: "",
    }
  }

  lgg.onlyIf(
    CONFIG.logging.override.Setup,
    `[prepareProblem] AI enhancement successful: ${JSONN.show(data, 2)}`
  )

  return {
    newGoal: data.instructionsToNodes,
    workflowIO: basicWorkflowIO,
    problemAnalysis: data.problemAnalysis,
  }
}
