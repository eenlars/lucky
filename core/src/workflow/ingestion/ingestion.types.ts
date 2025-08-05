import type { ZodTypeAny } from "zod"

export type WorkflowIO = {
  // this will be the input of a workflow.
  workflowInput: string
  // this may be an object, a number .. this is the correct answer what a workflow has to return.
  expectedWorkflowOutput: any
}

export type ExpectedOutputSchema = ZodTypeAny

// this is the input of a workflow, or genome.
// we can take an input for a workflow which might be a csv or a text question.
export type EvaluationInput =
  | EvaluationCSV
  | EvaluationText
  | PromptOnly
  | SWEBenchInput
  | GAIAInput
  | WebArenaInput

export type EvaluationCSV = {
  type: "csv"
  evaluation?: `column:${string}` // the column name of the expected output.
  inputFile?: string
  expectedOutputSchema?: ExpectedOutputSchema
  onlyIncludeInputColumns?: string[]
} & MainGoal

export type EvaluationText = {
  type: "text"
  question: string
  answer: string
  expectedOutputSchema?: ExpectedOutputSchema
} & MainGoal

export type PromptOnly = {
  type: "prompt-only"
  expectedOutputSchema?: never
} & MainGoal

export type SWEBenchInput = {
  type: "swebench"
  expectedOutputSchema?: ExpectedOutputSchema
} & MainGoal

export type GAIAInput = {
  type: "gaia"
  taskId: string
  level?: 1 | 2 | 3
  split?: "validation" | "test"
  expectedOutputSchema?: ExpectedOutputSchema
} & MainGoal

export type WebArenaInput = {
  type: "webarena"
  taskId?: number
  sites?: string[]
  limit?: number
  expectedOutputSchema?: ExpectedOutputSchema
} & MainGoal

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

export const needsEvaluation = (evaluation: EvaluationInput) => {
  return evaluation.type !== "prompt-only"
}

// the goal of this is to convert the evaluation to an array of WorkflowIO.
// one workflow has to work on many types of evaluations, so we need to
// convert the input to a format that every workflow can understand.
export type EvaluationToWorkflowIO = (
  evaluations: EvaluationInput
) => WorkflowIO[]

export interface MainGoal {
  goal: string
  workflowId: string // not invocationId!
}
