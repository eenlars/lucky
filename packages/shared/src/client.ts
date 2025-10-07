/**
 * Client-safe exports from @lucky/shared
 *
 * This entry point ONLY includes utilities that are safe to use in browser environments.
 * NO Node.js-specific code (fs, path, url, etc.) should be exported here.
 */

// Utility functions safe for client
export * from "./utils/common/isNir"
export * from "./utils/common/id"
export * from "./utils/common/array"
export * from "./utils/files/json/jsonParse"
export * from "./utils/zod/withDescriptions"

// Tool result types (type-only exports - Tools helpers are server-side only)
export type {
  Tools,
  CodeToolName,
  CodeToolFailure,
  CodeToolSuccess,
  CodeToolResult,
} from "./types/tool.types"

// Types only (no runtime code)
export type {
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./types/database.types"

// Model types (type-only, client-safe)
export type {
  LuckyProvider,
  ModelPricingV2,
  ActiveKeys,
  AnyModelName,
  AllowedModelName,
  ModelName,
  OpenRouterModelName,
  TokenUsage,
  StandardModels,
  ModelPool,
  ActiveModelName,
} from "./types/models"
export { providersV2 } from "./types/models"

// Memory schemas (client-safe)
export * from "./utils/memory/memorySchema"

// Message types (client-safe)
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
} from "./types/message"
export { isDelegationPayload, isSequentialPayload, extractTextFromPayload } from "./types/message"

// Workflow types (type-only, client-safe)
export type { WorkflowFile, OutputSchema } from "./types/workflow"
