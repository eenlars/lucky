/**
 * Message payload types - re-exported from @lucky/shared for backwards compatibility
 */
import type { TextContent } from "@core/messages/pipeline/mcp.types"
import type { Enums } from "@lucky/shared"
import type {
  AggregatedPayload as AggregatedPayloadBase,
  DelegationPayload as DelegationPayloadBase,
  Payload as PayloadBase,
  ReplyPayload as ReplyPayloadBase,
  SequentialPayload as SequentialPayloadBase,
} from "@lucky/shared/contracts/messages"

// collaboration Types

// OFFLOAD
// delegate: the source node asks the target node to do a task

// INFORM
// teach: the source node will teach the target node something
// status_update: the source node will update the target node on the status of the current task
// acknowledgement: the source node will acknowledge the target node's task

// ASK
//
// consensus_request: the source node will ask the target node for consensus on a task

/**
 * Enum alias of the `MessageRole` database type.
 * Represents the high-level intent or coordination kind of a message.
 * In the implementation, this matches the database enum.
 */
export type MessageType = Enums<"MessageRole">

/**
 * Re-export contract types for use throughout the codebase
 */
export type { AggregatedPayloadBase, DelegationPayloadBase, ReplyPayloadBase, SequentialPayloadBase }

/**
 * Implementation-specific payload types (aliases of contract types)
 */
export type DelegationPayload = DelegationPayloadBase
export type SequentialPayload = SequentialPayloadBase
export type ReplyPayload = ReplyPayloadBase
export type AggregatedPayload = AggregatedPayloadBase
export type Payload = PayloadBase

const joinBerichtenTexts = (items: TextContent[] | undefined): string =>
  Array.isArray(items)
    ? items
        .map(b => (typeof b.text === "string" ? b.text : ""))
        .filter(Boolean)
        .join("\n")
    : ""

export const extractTextFromPayload = (payload: Payload): string => {
  switch (payload.kind) {
    case "aggregated": {
      const agg = payload as AggregatedPayload
      return agg.messages
        .map(m => extractTextFromPayload(m.payload))
        .filter(Boolean)
        .join("\n")
    }
    case "delegation":
    case "sequential":
    case "result": {
      // Base payloads read directly from berichten
      const base = payload as DelegationPayload | SequentialPayload | ReplyPayload
      return joinBerichtenTexts(base.berichten)
    }
    default: {
      const _exhaustiveCheck: never = payload as never
      void _exhaustiveCheck
      return ""
    }
  }
}
