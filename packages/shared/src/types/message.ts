import type { Enums } from "./supabase.types"

/**
 * Optional annotations for the client. The client can use annotations to inform how objects are used or displayed
 */
export interface Annotations {
  /**
   * Describes who the intended customer of this object or data is.
   *
   * It can include multiple entries to indicate content useful for multiple audiences (e.g., `["user", "assistant"]`).
   */
  audience?: string[]

  /**
   * Describes how important this data is for operating the server.
   *
   * A value of 1 means "most important," and indicates that the data is
   * effectively required, while 0 means "least important," and indicates that
   * the data is entirely optional.
   */
  priority?: number

  /**
   * The moment the resource was last modified, as an ISO 8601 formatted string.
   */
  lastModified?: string
}

export interface TextContent {
  type: "text"

  /**
   * The text content of the message.
   */
  text: string

  /**
   * Optional annotations for the client.
   */
  annotations?: Annotations

  /**
   * Optional metadata for the content.
   */
  _meta?: { [key: string]: unknown }
}

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
  berichten: TextContent[]
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
  kind: "result"
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

export const isDelegationPayload = (payload: unknown): payload is DelegationPayload => {
  if (!payload || typeof payload !== "object") return false
  return (payload as DelegationPayload).kind === "delegation"
}

export const isSequentialPayload = (payload: unknown): payload is SequentialPayload => {
  if (!payload) return false
  return (payload as SequentialPayload).kind === "sequential"
}

/**
 * Discriminated union of all supported payload shapes.
 */
export type Payload = DelegationPayload | SequentialPayload | AggregatedPayload | ReplyPayload

const joinBerichtenTexts = (items: TextContent[] | undefined): string =>
  Array.isArray(items)
    ? items
        .map(b => (typeof b.text === "string" ? b.text : ""))
        .filter(Boolean)
        .join("\n")
    : ""

/**
 * Extract all text content from a payload (recursively handles aggregated payloads)
 */
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
