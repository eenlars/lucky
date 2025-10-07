import type { AgentSteps } from "./messages"
import type { WorkflowFile } from "./tools"
import type { WorkflowNodeConfig } from "./workflow"

/**
 * Result returned from a single node invocation
 */
export interface NodeInvocationResult<TPayload = any, TSummary = any> {
  nodeInvocationId: string
  nodeInvocationFinalOutput: string
  summaryWithInfo: TSummary
  replyMessage: TPayload
  nextIds: readonly string[]
  /** Optional: when present, use these to enqueue exact per-target messages */
  outgoingMessages?: { toNodeId: string; payload: TPayload }[]
  usdCost: number
  error?: {
    message: string
    stack?: string
  }
  agentSteps: AgentSteps
  updatedMemory?: Record<string, string>
  debugPrompts: string[]
}

/**
 * Core interface that all workflow node implementations must satisfy
 * Minimal API - additional capabilities exposed via optional capability interfaces below
 */
export interface IWorkflowNode<TPayload = any, TSummary = any, TConfig = WorkflowNodeConfig> {
  /** Unique identifier for this node */
  readonly nodeId: string

  /**
   * Invoke the node with the given context and return the result
   */
  invoke(context: NodeInvocationCallContext<TPayload, TConfig>): Promise<NodeInvocationResult<TPayload, TSummary>>

  /**
   * Export the current configuration of this node
   */
  toConfig(): TConfig

  /**
   * Get the list of handoff target node IDs (optional - used by orchestrator)
   */
  getHandOffs?(): string[]
}

/**
 * Optional capability: Node supports MCP tools
 */
export interface SupportsMCPTools {
  getMCPTools(): Record<string, any>
}

/**
 * Optional capability: Node supports code tools
 */
export interface SupportsCodeTools {
  getCodeTools(): Record<string, any>
}

/**
 * Optional capability: Node supports self-improvement
 */
export interface SelfImproving<TConfig = WorkflowNodeConfig> {
  selfImprove(params: {
    workflowInvocationId: string
    fitness: any
    setup: any
    goal: string
  }): Promise<TConfig>
}

/**
 * Factory function type for creating workflow nodes
 */
export type NodeFactory<TPayload = any, TSummary = any, TConfig = WorkflowNodeConfig> = (
  config: TConfig,
  workflowVersionId: string,
  skipDatabasePersistence?: boolean,
  persistence?: any,
) => Promise<IWorkflowNode<TPayload, TSummary, TConfig>>

/**
 * Execution context passed to a node's invoke method
 */
export interface NodeInvocationCallContext<TPayload = any, TConfig = WorkflowNodeConfig> {
  startTime: string
  workflowVersionId: string
  workflowId: string
  workflowInvocationId: string

  workflowMessageIncoming: any // Will be properly typed in messages

  nodeConfig: TConfig
  nodeMemory: Record<string, string>

  workflowFiles?: WorkflowFile[]
  expectedOutputType?: any
  mainWorkflowGoal?: string

  // workflowConfig is used for hierarchical role inference
  workflowConfig?: any // Will be properly typed in workflow

  // persistence for database operations
  persistence?: any
  skipDatabasePersistence?: boolean

  // Optional tool strategy override
  toolStrategyOverride?: "v2" | "v3"
}
