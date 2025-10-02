import { CONFIG, isLoggingEnabled } from "@core/core-config/compat"
import { getDefaultModels } from "@core/core-config/compat"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { JSONN } from "@core/utils/json"
import { lgg } from "@core/utils/logging/Logger"
import { IngestionLayer } from "@core/workflow/ingestion/IngestionLayer"
import type { EvaluationInput, WorkflowIO } from "@core/workflow/ingestion/ingestion.types"
import { invokeWorkflow } from "@core/workflow/runner/invokeWorkflow"
import type { InvocationInput } from "@core/workflow/runner/types"
import { z } from "zod"

export type PrepareProblemMethod = "workflow" | "ai" | "none"

const ProblemAnalysisSchema = z.object({
  problemAnalysis: z
    .string()
    .describe(
      "Analysis of workflow input including boundaries, edge cases, difficulty level, assumptions, reasoning, and expected output.",
    ),
  instructionsToNodes: z
    .string()
    .describe(
      "to keep it more simple and concise, you need to think about the main goal of the workflow and the instructions to the nodes. make it concise and to the point. it needs to be clear.",
    ),
})

export const prepareProblem = async (
  task: EvaluationInput,
  method: PrepareProblemMethod,
): Promise<{
  newGoal: string
  workflowIO: WorkflowIO[]
  problemAnalysis: string
}> => {
  lgg.info("[prepareProblem] Processing evaluation input", {
    type: task.type,
    goal: task.goal,
    question: task.type === "text" ? task.question : undefined,
    method,
  })

  // For prompt-only ingestion, skip enhancement entirely
  if (task.type === "prompt-only") {
    lgg.info("[prepareProblem] Skipping enhancement for prompt-only input")
    return {
      newGoal: task.goal,
      workflowIO: await IngestionLayer.convert(task),
      problemAnalysis: "",
    }
  }

  // New workflow invocation method
  if (method === "workflow") {
    lgg.info("[prepareProblem] Using workflow version ID for problem analysis", {
      workflowVersionId: CONFIG.workflow.prepareProblemWorkflowVersionId,
      method,
    })

    // Get the basic conversion from IngestionLayer
    const basicWorkflowIO = await IngestionLayer.convert(task)

    // Invoke the workflow with the specified version ID
    const invocationInput: InvocationInput = {
      workflowVersionId: CONFIG.workflow.prepareProblemWorkflowVersionId,
      evalInput: {
        type: "prompt-only", // no need to evaluate this.
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
          outputMessage: `${workflowResult.outputMessage?.slice(0, 100)}...`,
        })

        return {
          newGoal: task.goal, // Return original goal as requested
          workflowIO: basicWorkflowIO, // Return basicWorkflowIO as requested
          problemAnalysis: workflowResult.outputMessage || "No analysis provided", // Return new problem analysis
        }
      }
      lgg.warn("[prepareProblem] Workflow invocation failed, falling back to AI method", {
        error: result.error,
      })
    } catch (error) {
      lgg.error("[prepareProblem] Workflow invocation error, falling back to AI method", {
        error: error instanceof Error ? error.message : String(error),
      })
      // Fall through to AI method
    }
  } else if (method === "ai") {
    // Original AI-based method (fallback or when method === "ai")
    lgg.info("[prepareProblem] Using AI enhancement method")

    // First, get the basic conversion from IngestionLayer
    const basicWorkflowIO = await IngestionLayer.convert(task)

    // Use AI to enhance and analyze the problem
    // get some random sample values of the workflowIO, so we can see the boundaries of the training input.
    const sampleWorkflowIO = basicWorkflowIO
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
      .map(w => w.workflowInput)

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
- Consider what additional information would be helpful for problem-solving
- Output the problem analysis in 2 sentences.
`

    // send a request to the AI to get the boundaries of the training input.
    const { data, success, error, usdCost } = await sendAI({
      mode: "structured",
      schema: ProblemAnalysisSchema,
      model: getDefaultModels().medium,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `
          Please analyze this workflow input to the very best of your ability:
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

    lgg.onlyIf(isLoggingEnabled("Setup"), `[prepareProblem] AI enhancement successful: ${JSONN.show(data, 2)}`)

    return {
      newGoal: data.instructionsToNodes,
      workflowIO: basicWorkflowIO,
      problemAnalysis: data.problemAnalysis,
    }
  }
  return {
    newGoal: task.goal,
    workflowIO: await IngestionLayer.convert(task),
    problemAnalysis: "",
  }
}
