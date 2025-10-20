import type { WorkflowMessage } from "@core/messages/WorkflowMessage"
import type { NodeMemory } from "@core/utils/memory/memorySchema"
import type { WorkflowConfig, WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import type { IPersistence } from "@lucky/adapter-supabase"
import type { NodeInvocationCallContext as NodeInvocationCallContextBase } from "@lucky/shared/contracts/agent"

/**
 * Execution context for invoking a workflow node.
 * Extends the contract context with implementation-specific data.
 */
export interface NodeInvocationCallContext extends NodeInvocationCallContextBase {
  startTime: string
  workflowVersionId: string
  workflowId: string
  workflowInvocationId: string
  nodeVersionId?: string

  workflowMessageIncoming: WorkflowMessage

  nodeConfig: WorkflowNodeConfig
  nodeMemory: NodeMemory

  /**
   * Workflow configuration for hierarchical role inference.
   * Used to validate orchestrator-worker patterns in hierarchical mode.
   */
  workflowConfig?: WorkflowConfig

  /**
   * Persistence adapter for database operations.
   * If provided, node execution is persisted to database.
   */
  persistence?: IPersistence

  /**
   * NodeInvocation ID for lifecycle tracking (new pattern).
   * When provided, indicates record already exists with status='running'.
   * Node handlers should update this record to status='completed'/'failed' at end.
   */
  nodeInvocationId?: string

  /**
   * Skip database persistence for tests or dry-runs.
   */
  skipDatabasePersistence?: boolean

  /**
   * Override tool execution strategy (v2, v3, or auto for SDK mode).
   */
  toolStrategyOverride?: "v2" | "v3" | "auto"
}
