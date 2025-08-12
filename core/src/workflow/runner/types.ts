import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import type { InvocationSummary } from "@core/messages/summaries"
import type { Workflow } from "@core/workflow/Workflow"

/**
 * Parameters for a basic in-memory queue-based workflow run.
 */
export interface QueueRunParams {
  /** The instantiated `Workflow` to execute */
  workflow: Workflow
  /** Starting input string for the entry node */
  workflowInput: string
  /** Unique id for this run (used for tracing/persistence) */
  workflowInvocationId: string
}

/**
 * Parameters controlling a resilient workflow run.
 * Extends the basic run with checkpointing and health monitoring controls.
 */
// NOTE: Resilient run types are intentionally kept out for now
// because the resilient runner is experimental and not used yet.

/**
 * Result of the queue-based run, including transcript, timing and costs.
 */
export interface QueueRunResult {
  success: boolean
  agentSteps: AgentSteps
  finalWorkflowOutput: string
  error?: string
  totalTime: number
  totalCost: number
}

/**
 * Result summary of a resilient workflow run.
 */
// See note above about resilient types being excluded for now.

/**
 * Computed evaluation artifacts for a single queue run.
 */
export interface EvaluationResult {
  transcript: AgentSteps
  summaries: InvocationSummary[]
  fitness: FitnessOfWorkflow
  feedback: string
  finalWorkflowOutput: string
}

/**
 * Aggregated evaluation across all inputs for a workflow.
 */
export interface AggregateEvaluationResult {
  results: EvaluationResult[]
  totalCost: number
  averageFitness: FitnessOfWorkflow
  averageFeedback: string
}

/**
 * Run result for a single workflow IO case.
 */
export interface RunResult {
  /** The created invocation id for this specific IO */
  workflowInvocationId: string
  /** The run-level outputs for this IO */
  queueRunResult: QueueRunResult
}

/**
 * Union of supported ways to invoke a workflow.
 * Provide `evalInput` and exactly one of:
 * - workflowVersionId: load config from database by version id
 * - filename: load config from a local file
 * - dslConfig: pass a config object directly
 */
export type InvocationInput = {
  evalInput: import("@core/workflow/ingestion/ingestion.types").EvaluationInput
} & (
  | { workflowVersionId: string; filename?: never; dslConfig?: never }
  | { filename: string; workflowVersionId?: never; dslConfig?: never }
  | {
      dslConfig: import("@core/workflow/schema/workflow.types").WorkflowConfig
      workflowVersionId?: never
      filename?: never
    }
)

/**
 * Result wrapper for ad-hoc workflow invocation with optional evaluation.
 */
export interface InvokeWorkflowResult extends RunResult {
  fitness?: FitnessOfWorkflow
  feedback?: string
  usdCost?: number
  outputMessage?: string
}
