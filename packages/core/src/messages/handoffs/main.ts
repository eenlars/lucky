import type { WorkflowMessage } from "@messages/WorkflowMessage"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"

import type { NodeLogs } from "@messages/api/processResponse"
import type { HandoffResult } from "@messages/handoffs/handOffUtils"
import { chooseHandoffHierarchical } from "@messages/handoffs/types/hierarchical"
import { getSettings } from "@utils/config/runtimeConfig"
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
  switch (getSettings().coordinationType) {
    case "sequential":
      return chooseHandoffSequential(opts)
    case "hierarchical":
      return chooseHandoffHierarchical(opts)
    default:
      throw new Error(
        `Unsupported coordination type: ${getSettings().coordinationType}`
      )
  }
}
