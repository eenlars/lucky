import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"

import type { OutputSchema } from "@core/workflow/ingestion/ingestion.types"
import { z } from "zod"

type RubricItem = {
  evaluationCriterion: string
  maxPoints: number
}

export interface FitnessOfWorkflow {
  score: number
  accuracy: number // 0-100
  totalCostUsd: number
  totalTimeSeconds: number
}

// simplified schema - only validate what the AI is asked to output
export const FitnessOfWorkflowSchema = z.object({
  accuracy: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(0)
    .transform(val => Math.max(0, Math.min(100, val)))
    .describe("Accuracy score 0-100 based on matching ground truth"),
  feedback: z.string().min(1).default("Reasoning").describe("reasoning about the accuracy of the workflow"),
})

export type FitnessFunctionInput = {
  agentSteps: AgentSteps
  finalWorkflowOutput: string
  totalTime: number
  totalCost: number
  evaluation: string
  outputSchema?: OutputSchema
  overrideModel?: string
  rubric?: RubricItem[]
}
