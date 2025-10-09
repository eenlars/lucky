import type { WorkflowMessage } from "@core/messages/WorkflowMessage"
import type { NodeMemory } from "@core/utils/memory/memorySchema"
import type { WorkflowConfig, WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import type { NodeInvocationCallContext as NodeInvocationCallContextBase } from "@lucky/contracts/agent"
import type { IPersistence } from "@together/adapter-supabase"

/**
 * User execution context type (imported dynamically to avoid circular deps)
 */
type UserExecutionContext = any

/**
 * Execution context for invoking a workflow node.
 * Extends the contract context with implementation-specific data.
 */
export interface NodeInvocationCallContext extends NodeInvocationCallContextBase {
  startTime: string
  workflowVersionId: string
  workflowId: string
  workflowInvocationId: string

  workflowMessageIncoming: WorkflowMessage

  nodeConfig: WorkflowNodeConfig
  nodeMemory: NodeMemory

  // workflowConfig is used for hierarchical role inference
  workflowConfig?: WorkflowConfig

  // persistence for database operations
  persistence?: IPersistence

  // user execution context for API key resolution
  userContext?: UserExecutionContext

  //optional
  skipDatabasePersistence?: boolean
  toolStrategyOverride?: "v2" | "v3"
}
