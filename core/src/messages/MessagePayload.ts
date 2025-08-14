import type { TextContent } from "@core/messages/pipeline/mcp.types"
import type { Enums } from "@lucky/shared"
// collaboration Types

// OFFLOAD
// delegate: the source node asks the target node to do a task

// INFORM
// teach: the source node will teach the target node something
// status_update: the source node will update the target node on the status of the current task
// acknowledgement: the source node will acknowledge the target node's task

// ASK
// clarification: the source node will clarify the target node's task
// consensus_request: the source node will ask the target node for consensus on a task

/**
 * Enum alias of the `MessageRole` database type.
 * Represents the high-level intent or coordination kind of a message.
 */
export type MessageType = Enums<"MessageRole">

/**
 * Common fields shared by all payload kinds.
 * - kind: discriminant for payload shape
 * - berichten: list of textual items composing the message body
 */
export interface BasePayload {
  kind: MessageType
  berichten: TextContent[] // todo-payload change name after the aggregated payload is renamed
}

/**
 * Payload indicating sequential handoff/processing to the next node.
 */
export interface SequentialPayload extends BasePayload {
  kind: "sequential"
}

/**
 * Payload indicating delegated work to a specific recipient node.
 */
export interface DelegationPayload extends BasePayload {
  kind: "delegation"
}

/**
 * Final/terminal payload carrying the result of a workflow branch.
 */
export interface ReplyPayload extends BasePayload {
  kind: "result" //todo-payload change name to reply
}

/**
 * Payload combining results from multiple workers.
 */
export interface AggregatedPayload extends BasePayload {
  kind: "aggregated"
  messages: Array<{
    fromNodeId: string
    payload: Payload
  }>
}

export const isDelegationPayload = (
  payload: unknown
): payload is DelegationPayload => {
  return (payload as DelegationPayload).kind === "delegation"
}

export const isSequentialPayload = (
  payload: unknown
): payload is SequentialPayload => {
  if (!payload) return false
  return (payload as SequentialPayload).kind === "sequential"
}

/**
 * Discriminated union of all supported payload shapes.
 */
export type Payload =
  | DelegationPayload
  | SequentialPayload
  | AggregatedPayload
  | ReplyPayload

const joinBerichtenTexts = (items: TextContent[] | undefined): string =>
  Array.isArray(items)
    ? items
        .map((b) => (typeof b.text === "string" ? b.text : ""))
        .filter(Boolean)
        .join("\n")
    : ""

export const extractTextFromPayload = (payload: Payload): string => {
  switch (payload.kind) {
    case "aggregated": {
      const agg = payload as AggregatedPayload
      return agg.messages
        .map((m) => extractTextFromPayload(m.payload))
        .filter(Boolean)
        .join("\n")
    }
    case "delegation":
    case "sequential":
    case "result": {
      // Base payloads read directly from berichten
      const base = payload as
        | DelegationPayload
        | SequentialPayload
        | ReplyPayload
      return joinBerichtenTexts(base.berichten)
    }
    default: {
      const _exhaustiveCheck: never = payload as never
      void _exhaustiveCheck
      return ""
    }
  }
}
