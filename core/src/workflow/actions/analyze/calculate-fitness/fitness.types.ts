import type { NodeLogs } from "@core/messages/api/processResponse"
import type { ExpectedOutputSchema } from "@core/workflow/ingestion/ingestion.types"
import { z } from "zod"

export interface FitnessOfWorkflow {
  score: number
  accuracy: number // 1-100
  novelty: number // 1-100
  totalCostUsd: number
  totalTimeSeconds: number
}

export const feedbackPrompt = `
Provide comprehensive feedback analyzing the workflow execution, including:
- accuracy justification,
- novelty justification,
- identified strengths and weaknesses,
- detailed analysis of what went wrong or is missing (considering the input question, execution environment, tools used, configuration, and output), 
- estimated impact analysis of the current implementation.
`

// simplified schema - only validate what the AI is asked to output
export const FitnessOfWorkflowSchema = z.object({
  accuracy: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(1)
    .transform((val) => Math.max(1, Math.min(100, val)))
    .describe("Accuracy score 1-100 based on matching ground truth"),
  novelty: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(1)
    .transform((val) => Math.max(1, Math.min(100, val)))
    .describe("Novelty score 1-100 on how promising the approach is"),
  feedback: z
    .string()
    .min(1)
    .default("Reasoning")
    .describe("reasoning about the accuracy and novelty of the workflow"),
})

export type FitnessFunctionInput = {
  nodeOutputs: NodeLogs[]
  finalWorkflowOutput: string
  totalTime: number
  totalCost: number
  evaluation: string
  expectedOutputSchema?: ExpectedOutputSchema
}
