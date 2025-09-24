import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import type { InvocationSummary } from "@core/messages/summaries"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
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
 * Runtime settings that control workflow behavior
 */
export interface RuntimeSettings {
  skipEvaluation?: boolean    
  skipPreparation?: boolean   
  preparationMethod?: "ai" | "workflow" | "none"
  tools?: string[]            
  maxCost?: number           
}

/**
 * Workflow invocation input
 */
export interface InvocationInput {
  // What to run
  evalInput: EvaluationInput
  
  // Where to get the workflow (exactly one required)
  workflowVersionId?: string  // From database
  filename?: string           // From file
  dslConfig?: WorkflowConfig  // Direct config
  
  // How to run it
  runtime?: RuntimeSettings
}

/**
 * Result wrapper for ad-hoc workflow invocation with optional evaluation.
 */
export interface InvokeWorkflowResult extends RunResult {
  fitness?: FitnessOfWorkflow
  feedback?: string
  usdCost?: number
  outputMessage?: string
}
