import type { AgentSteps } from "./messages"
import type { WorkflowFile } from "./tools"
import type { WorkflowNodeConfig } from "./workflow"

/**
 * Result returned from a single node invocation
 */
export interface NodeInvocationResult<TPayload = unknown, TSummary = unknown> {
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
export interface IWorkflowNode<TPayload = unknown, TSummary = unknown, TConfig = WorkflowNodeConfig> {
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
  getMCPTools(): Record<string, unknown>
}

/**
 * Optional capability: Node supports code tools
 */
export interface SupportsCodeTools {
  getCodeTools(): Record<string, unknown>
}

/**
 * Optional capability: Node supports self-improvement
 */
export interface SelfImproving<TConfig = WorkflowNodeConfig> {
  selfImprove(params: {
    workflowInvocationId: string
    fitness: unknown
    setup: unknown
    goal: string
  }): Promise<TConfig>
}

/**
 * Factory function type for creating workflow nodes
 */
export type NodeFactory<TPayload = unknown, TSummary = unknown, TConfig = WorkflowNodeConfig> = (
  config: TConfig,
  workflowVersionId: string,
  skipDatabasePersistence?: boolean,
  persistence?: unknown,
) => Promise<IWorkflowNode<TPayload, TSummary, TConfig>>

/**
 * Execution context passed to a node's invoke method
 */
export interface NodeInvocationCallContext<_TPayload = unknown, TConfig = WorkflowNodeConfig> {
  startTime: string
  workflowVersionId: string
  workflowId: string
  workflowInvocationId: string

  workflowMessageIncoming: unknown

  nodeConfig: TConfig
  nodeMemory: Record<string, string>

  workflowFiles?: WorkflowFile[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectedOutputType?: any // Overridden by tools package with ZodTypeAny
  mainWorkflowGoal?: string

  // workflowConfig is used for hierarchical role inference
  workflowConfig?: unknown

  // persistence for database operations
  persistence?: unknown
  skipDatabasePersistence?: boolean

  // Optional tool strategy override
  toolStrategyOverride?: "v2" | "v3" | "auto"
}
