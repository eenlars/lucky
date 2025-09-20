/**
 * Workflow Event Context Manager
 *
 * Provides a clean interface for emitting workflow events
 * with proper context tracking using AsyncLocalStorage.
 */

import { obs } from "./obs"
import type {
  WorkflowEvent,
  BaseWorkflowEvent,
  WorkflowStartedEvent,
  WorkflowCompletedEvent,
  NodeExecutionStartedEvent,
  NodeExecutionCompletedEvent,
  MessageQueuedEvent,
  MessageProcessedEvent,
  ToolExecutionStartedEvent,
  ToolExecutionCompletedEvent,
  LLMCallStartedEvent,
  LLMCallCompletedEvent,
  MemoryUpdatedEvent,
  WorkflowProgressEvent,
  WorkflowErrorEvent,
} from "./events/WorkflowEvents"

/**
 * Context manager for workflow event emission
 * Automatically includes workflow context in events
 */
export class WorkflowEventContext {
  private readonly baseContext: BaseWorkflowEvent

  constructor(context: {
    wfId: string
    wfVersionId: string
    invocationId: string
  }) {
    this.baseContext = {
      ts: new Date().toISOString(),
      wfId: context.wfId,
      wfVersionId: context.wfVersionId,
      invocationId: context.invocationId,
    }
  }

  /**
   * Update the base context timestamp
   */
  private updateTimestamp(): BaseWorkflowEvent {
    return {
      ...this.baseContext,
      ts: new Date().toISOString(),
    }
  }

  /**
   * Emit workflow started event
   */
  workflowStarted(data: {
    nodeCount: number
    entryNodeId: string
    goal: string
  }): void {
    const event: WorkflowStartedEvent = {
      ...this.updateTimestamp(),
      event: "workflow:started",
      ...data,
    }
    obs.workflowEvent(event)
  }

  /**
   * Emit workflow completed event
   */
  workflowCompleted(data: {
    duration: number
    totalCost: number
    nodeInvocations: number
    status: "success" | "failed"
    error?: string
  }): void {
    const event: WorkflowCompletedEvent = {
      ...this.updateTimestamp(),
      event: "workflow:completed",
      ...data,
    }
    obs.workflowEvent(event)
  }

  /**
   * Emit node execution started event
   */
  nodeExecutionStarted(data: {
    nodeId: string
    nodeType: string
    attempt: number
  }): void {
    const event: NodeExecutionStartedEvent = {
      ...this.updateTimestamp(),
      event: "node:execution:started",
      ...data,
    }
    obs.workflowEvent(event)
  }

  /**
   * Emit node execution completed event
   */
  nodeExecutionCompleted(data: {
    nodeId: string
    nodeType: string
    duration: number
    cost: number
    status: "success" | "failed"
    error?: string
    outputTokens?: number
    inputTokens?: number
  }): void {
    const event: NodeExecutionCompletedEvent = {
      ...this.updateTimestamp(),
      event: "node:execution:completed",
      ...data,
    }
    obs.workflowEvent(event)
  }

  /**
   * Emit message queued event
   */
  messageQueued(data: {
    fromNodeId: string
    toNodeId: string
    messageSeq: number
    messageType: string
  }): void {
    const event: MessageQueuedEvent = {
      ...this.updateTimestamp(),
      event: "message:queued",
      ...data,
    }
    obs.workflowEvent(event)
  }

  /**
   * Emit message processed event
   */
  messageProcessed(data: {
    fromNodeId: string
    toNodeId: string
    messageSeq: number
    processingTime: number
  }): void {
    const event: MessageProcessedEvent = {
      ...this.updateTimestamp(),
      event: "message:processed",
      ...data,
    }
    obs.workflowEvent(event)
  }

  /**
   * Emit tool execution started event
   */
  toolExecutionStarted(data: {
    nodeId: string
    toolName: string
    toolType: "code" | "mcp"
    parameters?: Record<string, any>
  }): void {
    const event: ToolExecutionStartedEvent = {
      ...this.updateTimestamp(),
      event: "tool:execution:started",
      ...data,
    }
    obs.workflowEvent(event)
  }

  /**
   * Emit tool execution completed event
   */
  toolExecutionCompleted(data: {
    nodeId: string
    toolName: string
    toolType: "code" | "mcp"
    duration: number
    status: "success" | "failed"
    error?: string
    resultSize?: number
  }): void {
    const event: ToolExecutionCompletedEvent = {
      ...this.updateTimestamp(),
      event: "tool:execution:completed",
      ...data,
    }
    obs.workflowEvent(event)
  }

  /**
   * Emit LLM call started event
   */
  llmCallStarted(data: {
    nodeId: string
    model: string
    provider: string
    inputTokens: number
  }): void {
    const event: LLMCallStartedEvent = {
      ...this.updateTimestamp(),
      event: "llm:call:started",
      ...data,
    }
    obs.workflowEvent(event)
  }

  /**
   * Emit LLM call completed event
   */
  llmCallCompleted(data: {
    nodeId: string
    model: string
    provider: string
    duration: number
    inputTokens: number
    outputTokens: number
    cost: number
    status: "success" | "failed"
    error?: string
  }): void {
    const event: LLMCallCompletedEvent = {
      ...this.updateTimestamp(),
      event: "llm:call:completed",
      ...data,
    }
    obs.workflowEvent(event)
  }

  /**
   * Emit memory updated event
   */
  memoryUpdated(data: {
    nodeId: string
    memoryKeys: string[]
    updateType: "create" | "update" | "delete"
  }): void {
    const event: MemoryUpdatedEvent = {
      ...this.updateTimestamp(),
      event: "memory:updated",
      ...data,
    }
    obs.workflowEvent(event)
  }

  /**
   * Emit workflow progress event
   */
  workflowProgress(data: {
    completedNodes: number
    totalNodes: number
    currentNodeId: string
    estimatedCompletion?: number
  }): void {
    const event: WorkflowProgressEvent = {
      ...this.updateTimestamp(),
      event: "workflow:progress",
      ...data,
    }
    obs.workflowEvent(event)
  }

  /**
   * Emit workflow error event
   */
  workflowError(data: {
    error: string
    errorType: "validation" | "execution" | "timeout" | "resource"
    nodeId?: string
    recoverable: boolean
  }): void {
    const event: WorkflowErrorEvent = {
      ...this.updateTimestamp(),
      event: "workflow:error",
      ...data,
    }
    obs.workflowEvent(event)
  }

  /**
   * Create a scoped context with additional correlation data
   */
  withNodeContext<T>(nodeId: string, fn: (ctx: WorkflowEventContext) => T): T {
    return obs.scope({ nodeId }, () => fn(this)) as T
  }

  /**
   * Measure and emit timing for an operation
   */
  async withTiming<T>(
    operation: string,
    nodeId: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now()

    try {
      const result = await fn()
      const duration = Math.round(performance.now() - startTime)

      // Emit a single completed event with duration_ms for consistency
      obs.event(`${operation}:completed`, {
        nodeId,
        duration_ms: duration,
        status: "success",
      })

      return { result, duration }
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)

      // Emit a single completed event with error context
      obs.event(`${operation}:completed`, {
        nodeId,
        duration_ms: duration,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      })

      throw error
    }
  }
}
