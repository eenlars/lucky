import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import type { ModelEntry } from "@lucky/shared"

export type ModelSelectionStrategy =
  | {
      strategy: "user-models"
      models: ModelEntry[]
    }
  | {
      strategy: "tier"
    }
export interface GenerationOptions {
  /**
   * tier-based uses tiers to select models.
   * user-models-based uses the user's available models.
   */
  modelSelectionStrategy?: ModelSelectionStrategy
  /**
   * If provided, the workflow will be based on this workflow.
   */
  workflowDescription?: string
  workflowConfig?: WorkflowConfig
  workflowGoal?: string
  extraInfo?: string
  modelOverride?: string
}

/**
 * Result of a workflow generation batch.
 */
export type GenerateWorkflowsResult = {
  workflows: WorkflowConfig[]
  usdCost: number
} | null

/**
 * Options controlling validation/repair after generation.
 */
export type AfterGenerationOptions =
  | {
      verifyWorkflow?: undefined
      repairWorkflowAfterGeneration?: false
    }
  | {
      verifyWorkflow: "none"
      repairWorkflowAfterGeneration?: false
    }
  | {
      verifyWorkflow: "normal"
      repairWorkflowAfterGeneration: boolean
    }
  | {
      verifyWorkflow: "strict"
      repairWorkflowAfterGeneration: false
    }
