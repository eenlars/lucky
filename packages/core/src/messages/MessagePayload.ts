/**
 * Message payload types - re-exported from @lucky/shared for backwards compatibility
 */
export type {
  TextContent,
  Annotations,
  MessageType,
  BasePayload,
  SequentialPayload,
  DelegationPayload,
  ReplyPayload,
  AggregatedPayload,
  Payload,
} from "@lucky/shared"
export { isDelegationPayload, isSequentialPayload, extractTextFromPayload } from "@lucky/shared"
