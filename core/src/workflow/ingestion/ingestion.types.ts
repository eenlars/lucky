import type { ZodTypeAny } from "zod"

/**
 * Single IO case used to run and evaluate a workflow.
 */
export interface WorkflowIO {
  /** Starting input to the workflow */
  workflowInput: string
  /** Expected output and optional schema for validation */
  workflowOutput: {
    /** The expected value (shape follows MCP output) */
    output: any
    /** Optional zod schema for validating the output */
    outputSchema?: OutputSchema
  }
}

/** Zod schema representing the expected output type. */
export type OutputSchema = ZodTypeAny

/**
 * Supported evaluation input formats to drive a workflow.
 * This union enumerates all ingestion formats supported by the ingestion layer.
 */
export type EvaluationInput =
  | EvaluationCSV
  | EvaluationText
  | PromptOnly
  | SWEBenchInput
  | GAIAInput
  | WebArenaInput
  | DatasetRecordInput

/** CSV-backed evaluation input definition. */
export interface EvaluationCSV extends MainGoal {
  type: "csv"
  /** the column name of the expected output */
  evaluation?: `column:${string}`
  inputFile?: string
  outputSchema?: OutputSchema
  onlyIncludeInputColumns?: string[]
}

/** Plain text Q/A evaluation input. */
export interface EvaluationText extends MainGoal {
  type: "text"
  question: string
  answer: string
  outputSchema?: OutputSchema
}

/** Prompt-only input; used when no ground-truth evaluation is needed. */
export interface PromptOnly extends MainGoal {
  type: "prompt-only"
  outputSchema?: never
}

/** SWE-bench evaluation input, configured by goal and optional schema. */
export interface SWEBenchInput extends MainGoal {
  type: "swebench"
  outputSchema?: OutputSchema
}

/** GAIA evaluation input referencing a dataset task. */
export interface GAIAInput extends MainGoal {
  type: "gaia"
  taskId: string
  level?: 1 | 2 | 3
  split?: "validation" | "test"
  outputSchema?: OutputSchema
}

/** WebArena evaluation input definition. */
export interface WebArenaInput extends MainGoal {
  type: "webarena"
  taskId?: number
  sites?: string[]
  limit?: number
  outputSchema?: OutputSchema
}

/** Dataset record evaluation input definition. */
export interface DatasetRecordInput extends MainGoal {
  type: "dataset-records"
  recordIds: string[]
  outputSchema?: OutputSchema
}

// gaia dataset instance structure
export interface GAIAInstance {
  task_id: string
  Question: string
  Level: number
  "Final answer"?: string
  file_name?: string
  file_content?: string | Buffer
}

export interface SWEBenchInstance {
  instance_id: string
  problem_statement: string
  text: string
  repo: string
  base_commit: string
  patch: string
  test_patch?: string | null
}

export interface WebArenaInstance {
  task_id: number
  sites: string[]
  intent_template: string
  intent: string
  require_login: boolean
  eval: {
    eval_types: string[]
    reference_answers: {
      exact_match?: string
      must_include?: string[]
      fuzzy_match?: string[]
    }
  }
}

/** True if the input type implies an evaluation phase is possible. */
export const hasGroundTruth = (evaluation: EvaluationInput): boolean => {
  switch (evaluation.type) {
    case "prompt-only":
      return false
    case "text":
      return (evaluation.answer ?? "").trim().length > 0
    case "csv":
      // evaluable only when a column is specified to compare against
      return (
        typeof evaluation.evaluation === "string" &&
        evaluation.evaluation.trim().length > 0
      )
    case "gaia":
    case "swebench":
    case "webarena":
    case "dataset-records":
      return true
  }

  // Exhaustiveness guard: if a new type is added to EvaluationInput
  // and not handled above, this will fail type-checking.
  const _exhaustive: never = evaluation as never
  throw new Error("Unhandled evaluation type in hasGroundTruth")
}

/** True if the input type implies an evaluation phase is possible. */
export const needsEvaluation = (evaluation: EvaluationInput) =>
  hasGroundTruth(evaluation)

// the goal of this is to convert the evaluation to an array of WorkflowIO.
// one workflow has to work on many types of evaluations, so we need to
// convert the input to a format that every workflow can understand.
/** Function type for converting evaluation inputs into workflow IO cases. */
export type EvaluationToWorkflowIO = (
  evaluations: EvaluationInput
) => WorkflowIO[]

/**
 * Shared goal and workflow identifier used by all evaluation inputs.
 * Note: `workflowId` refers to the logical workflow, not an invocation id.
 */
export interface MainGoal {
  goal: string
  workflowId: string
}
