import type { WorkflowMessage } from "@core/messages/WorkflowMessage"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { CONFIG } from "@core/core-config/compat"

import type { HandoffResult } from "@core/messages/handoffs/handOffUtils"
import { chooseHandoffHierarchical } from "@core/messages/handoffs/types/hierarchical"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import { chooseHandoffSequential } from "./types/sequential"

/**
 * Inputs required to choose the next handoff target.
 */
export interface ChooseHandoffOpts {
  systemPrompt: string
  workflowMessage: WorkflowMessage
  handOffs: string[]
  content: string
  agentSteps?: AgentSteps
  memory?: Record<string, string>
  workflowConfig?: WorkflowConfig // Added for hierarchical role inference
}

export async function chooseHandoff(opts: ChooseHandoffOpts): Promise<HandoffResult> {
  switch (CONFIG.coordinationType) {
    case "sequential":
      return chooseHandoffSequential(opts)
    case "hierarchical":
      return chooseHandoffHierarchical(opts)
    default: {
      const _exhaustiveCheck: never = CONFIG.coordinationType
      void _exhaustiveCheck
      throw new Error(`Unsupported coordination type: ${CONFIG.coordinationType}`)
    }
  }
}
