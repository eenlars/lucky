import type { EvaluationInput } from "@workflow/ingestion/ingestion.types"

/**
 * Default evaluation input for when no specific input is provided
 */
export const DEFAULT_EVALUATION_INPUT: EvaluationInput = {
  type: "text",
  goal: "Default workflow execution",
  question: "Execute the default workflow",
  answer: "Default execution completed",
  workflowId: "default-workflow",
}