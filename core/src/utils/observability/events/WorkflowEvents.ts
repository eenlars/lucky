/**
 * Type-safe workflow event definitions for observability
 *
 * Defines all events emitted during workflow execution
 * with proper TypeScript types for better DX and safety.
 */

export interface BaseWorkflowEvent {
  ts: string
  wfId: string
  wfVersionId: string
  invocationId: string
}

export interface WorkflowStartedEvent extends BaseWorkflowEvent {
  event: "workflow:started"
  nodeCount: number
  entryNodeId: string
  goal: string
}

export interface WorkflowCompletedEvent extends BaseWorkflowEvent {
  event: "workflow:completed"
  duration: number
  totalCost: number
  nodeInvocations: number
  status: "success" | "failed"
  error?: string
}

export interface NodeExecutionStartedEvent extends BaseWorkflowEvent {
  event: "node:execution:started"
  nodeId: string
  nodeType: string
  attempt: number
}

export interface NodeExecutionCompletedEvent extends BaseWorkflowEvent {
  event: "node:execution:completed"
  nodeId: string
  nodeType: string
  duration: number
  cost: number
  status: "success" | "failed"
  error?: string
  outputTokens?: number
  inputTokens?: number
}

export interface MessageQueuedEvent extends BaseWorkflowEvent {
  event: "message:queued"
  fromNodeId: string
  toNodeId: string
  messageSeq: number
  messageType: string
}

export interface MessageProcessedEvent extends BaseWorkflowEvent {
  event: "message:processed"
  fromNodeId: string
  toNodeId: string
  messageSeq: number
  processingTime: number
}

export interface ToolExecutionStartedEvent extends BaseWorkflowEvent {
  event: "tool:execution:started"
  nodeId: string
  toolName: string
  toolType: "code" | "mcp"
  parameters?: Record<string, any>
}

export interface ToolExecutionCompletedEvent extends BaseWorkflowEvent {
  event: "tool:execution:completed"
  nodeId: string
  toolName: string
  toolType: "code" | "mcp"
  duration: number
  status: "success" | "failed"
  error?: string
  resultSize?: number
}

export interface LLMCallStartedEvent extends BaseWorkflowEvent {
  event: "llm:call:started"
  nodeId: string
  model: string
  provider: string
  inputTokens: number
}

export interface LLMCallCompletedEvent extends BaseWorkflowEvent {
  event: "llm:call:completed"
  nodeId: string
  model: string
  provider: string
  duration: number
  inputTokens: number
  outputTokens: number
  cost: number
  status: "success" | "failed"
  error?: string
}

export interface MemoryUpdatedEvent extends BaseWorkflowEvent {
  event: "memory:updated"
  nodeId: string
  memoryKeys: string[]
  updateType: "create" | "update" | "delete"
}

export interface WorkflowProgressEvent extends BaseWorkflowEvent {
  event: "workflow:progress"
  completedNodes: number
  totalNodes: number
  currentNodeId: string
  estimatedCompletion?: number
}

export interface WorkflowErrorEvent extends BaseWorkflowEvent {
  event: "workflow:error"
  error: string
  errorType: "validation" | "execution" | "timeout" | "resource"
  nodeId?: string
  recoverable: boolean
}

/**
 * Union type of all workflow events for type safety
 */
export type WorkflowEvent =
  | WorkflowStartedEvent
  | WorkflowCompletedEvent
  | NodeExecutionStartedEvent
  | NodeExecutionCompletedEvent
  | MessageQueuedEvent
  | MessageProcessedEvent
  | ToolExecutionStartedEvent
  | ToolExecutionCompletedEvent
  | LLMCallStartedEvent
  | LLMCallCompletedEvent
  | MemoryUpdatedEvent
  | WorkflowProgressEvent
  | WorkflowErrorEvent

/**
 * Event emitter for workflow events with type safety
 */
export class WorkflowEventEmitter {
  private eventSinks: Array<(event: WorkflowEvent) => void> = []

  /**
   * Add an event sink to receive workflow events
   */
  addSink(sink: (event: WorkflowEvent) => void): void {
    this.eventSinks.push(sink)
  }

  /**
   * Remove an event sink
   */
  removeSink(sink: (event: WorkflowEvent) => void): void {
    const index = this.eventSinks.indexOf(sink)
    if (index > -1) {
      this.eventSinks.splice(index, 1)
    }
  }

  /**
   * Emit a workflow event to all registered sinks
   */
  emit<T extends WorkflowEvent>(event: T): void {
    for (const sink of this.eventSinks) {
      try {
        sink(event)
      } catch (error) {
        console.error("Error in workflow event sink:", error)
      }
    }
  }

  /**
   * Create a base event with common properties
   */
  createBaseEvent(context: {
    wfId: string
    wfVersionId: string
    invocationId: string
  }): BaseWorkflowEvent {
    return {
      ts: new Date().toISOString(),
      wfId: context.wfId,
      wfVersionId: context.wfVersionId,
      invocationId: context.invocationId,
    }
  }
}

/**
 * Global workflow event emitter instance
 */
export const workflowEvents = new WorkflowEventEmitter()
