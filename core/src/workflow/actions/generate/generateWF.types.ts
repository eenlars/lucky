import type { ModelName } from "@core/utils/spending/models.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"

export interface GenerationOptions {
  /**
   * If provided, the workflow will be based on this workflow.
   */
  workflowDescription?: string
  workflowConfig?: WorkflowConfig
  workflowGoal?: string
  extraInfo?: string

  modelOverride?: ModelName
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
