import type { WorkflowMessage } from "@core/messages/WorkflowMessage"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { CONFIG } from "@runtime/settings/constants"

import type { NodeLogs } from "@core/messages/api/processResponse"
import type { HandoffResult } from "@core/messages/handoffs/handOffUtils"
import { chooseHandoffHierarchical } from "@core/messages/handoffs/types/hierarchical"
import { chooseHandoffSequential } from "./types/sequential"

export type ChooseHandoffOpts = {
  systemPrompt: string
  workflowMessage: WorkflowMessage
  handOffs: string[]
  content: string
  toolUsage?: NodeLogs
  memory?: Record<string, string>
  workflowConfig?: WorkflowConfig // Added for hierarchical role inference
}

export async function chooseHandoff(
  opts: ChooseHandoffOpts
): Promise<HandoffResult> {
  switch (CONFIG.coordinationType) {
    case "sequential":
      return chooseHandoffSequential(opts)
    case "hierarchical":
      return chooseHandoffHierarchical(opts)
    default:
      throw new Error(
        `Unsupported coordination type: ${CONFIG.coordinationType}`
      )
  }
}
