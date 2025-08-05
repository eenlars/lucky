import type {
  ModelName,
  WorkflowConfig,
} from "@core/workflow/schema/workflow.types"

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

export type GenerateWorkflowsResult = {
  workflows: WorkflowConfig[]
  usdCost: number
} | null

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
