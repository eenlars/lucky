/**
 * Optional annotations for text content
 */
export interface Annotations {
  /** Intended audience for this content */
  audience?: string[]
  /** Priority level (0-1, where 1 is most important) */
  priority?: number
  /** ISO 8601 timestamp of last modification */
  lastModified?: string
}

/**
 * Text content with optional annotations and metadata
 */
export interface TextContent {
  type: "text"
  text: string
  annotations?: Annotations
  _meta?: { [key: string]: unknown }
}

/**
 * Enum-like type for message roles/kinds
 */
export type MessageType = "sequential" | "delegation" | "result" | "aggregated"

/**
 * Base structure for all payload types
 */
export interface BasePayload {
  kind: MessageType
  berichten: TextContent[]
}

/**
 * Payload indicating sequential handoff to the next node
 */
export interface SequentialPayload extends BasePayload {
  kind: "sequential"
}

/**
 * Payload indicating delegated work to a specific recipient
 */
export interface DelegationPayload extends BasePayload {
  kind: "delegation"
}

/**
 * Final/terminal payload carrying workflow results
 */
export interface ReplyPayload extends BasePayload {
  kind: "result"
}

/**
 * Payload combining results from multiple workers
 */
export interface AggregatedPayload extends BasePayload {
  kind: "aggregated"
  messages: Array<{
    fromNodeId: string
    payload: Payload
  }>
}

/**
 * Discriminated union of all supported payload shapes
 */
export type Payload = DelegationPayload | SequentialPayload | AggregatedPayload | ReplyPayload

/**
 * Type guard for delegation payloads
 */
export const isDelegationPayload = (payload: unknown): payload is DelegationPayload => {
  return (payload as DelegationPayload).kind === "delegation"
}

/**
 * Type guard for sequential payloads
 */
export const isSequentialPayload = (payload: unknown): payload is SequentialPayload => {
  if (!payload) return false
  return (payload as SequentialPayload).kind === "sequential"
}

/**
 * A single step produced by the agent while solving a task
 */
export type AgentStep<TOOL_CALL_OUTPUT_TYPE = unknown> =
  | {
      type: "prepare"
      name?: never
      args?: never
      return: string
    }
  | {
      type: "tool"
      name: string
      args: unknown
      return: TOOL_CALL_OUTPUT_TYPE
      summary?: string
    }
  | {
      type: "text"
      name?: never
      args?: never
      return: string
    }
  | {
      type: "reasoning"
      name?: never
      args?: never
      return: string
    }
  | {
      type: "plan"
      name?: never
      args?: never
      return: string
    }
  | {
      type: "error"
      name?: never
      args?: never
      return: string
      cause?: string
    }
  | {
      type: "learning"
      name?: never
      args?: never
      return: string
    }
  | {
      type: "terminate"
      name?: never
      args?: never
      summary: string
      return: TOOL_CALL_OUTPUT_TYPE | string
    }
  | {
      type: "debug"
      name?: never
      args?: never
      return: any
    }

/**
 * Convenience alias for an array of agent steps
 */
export type AgentSteps<TOOL_CALL_OUTPUT_TYPE = unknown> = AgentStep<TOOL_CALL_OUTPUT_TYPE>[]

/**
 * Summary information about a workflow invocation
 */
export interface InvocationSummary {
  nodeInvocationId: string
  nodeId: string
  summary: string
  createdAt: string
  usdCost: number
  modelName: string
  tokensUsed?: {
    prompt: number
    completion: number
    total: number
  }
}
