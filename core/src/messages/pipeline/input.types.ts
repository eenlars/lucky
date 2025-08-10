import type { WorkflowMessage } from "@core/messages/WorkflowMessage"
import type { InvocationContext } from "@core/tools/toolFactory"
import type { NodeMemory } from "@core/utils/memory/memorySchema"
import type {
  WorkflowConfig,
  WorkflowNodeConfig,
} from "@core/workflow/schema/workflow.types"

export interface NodeInvocationCallContext extends InvocationContext {
  startTime: string
  workflowVersionId: string

  workflowMessageIncoming: WorkflowMessage

  nodeConfig: WorkflowNodeConfig

  nodeMemory: NodeMemory

  // workflowConfig is used for hierarchical role inference
  workflowConfig?: WorkflowConfig

  //optional
  skipDatabasePersistence?: boolean
  toolStrategyOverride?: "v2" | "v3"
}
