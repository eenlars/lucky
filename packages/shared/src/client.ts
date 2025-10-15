/**
 * Client-safe exports from @lucky/shared
 *
 * This entry point ONLY includes utilities that are safe to use in browser environments.
 * NO Node.js-specific code (fs, path, url, etc.) should be exported here.
 */

// Utility functions safe for client
export * from "./utils/common/array"
export * from "./utils/common/id"
export * from "./utils/common/isNir"
export * from "./utils/files/json/jsonParse"
export * from "./utils/zod/withDescriptions"

// Tool result types (type-only exports - Tools helpers are server-side only)
export type {
  CodeToolFailure,
  CodeToolName,
  CodeToolResult,
  CodeToolSuccess,
  Tools,
} from "./types/tool.types"

// Types only (no runtime code)
// Export combined database types that include all schemas (public, iam, lockbox, app, mcp)
export type {
  AppDatabase,
  Database,
  Enums,
  IamDatabase,
  Json,
  LockboxDatabase,
  MCPDatabase,
  PublicDatabase,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./types/supabase.types"

// Model types (type-only, client-safe)
// Note: Most model types are now simplified to string. Runtime validation handles correctness.
export type {
  StandardModels,
  TokenUsage,
} from "./types/models"

// Memory schemas (client-safe)
export * from "./utils/memory/memorySchema"

// Message types (client-safe)
export { extractTextFromPayload, isDelegationPayload, isSequentialPayload } from "./types/message"
export type {
  AggregatedPayload,
  Annotations,
  BasePayload,
  DelegationPayload,
  MessageType,
  Payload,
  ReplyPayload,
  SequentialPayload,
  TextContent,
} from "./types/message"

// Workflow types (type-only, client-safe)
export type { OutputSchema, WorkflowFile } from "./types/workflow"

// Provider contracts (client-safe)
export {
  apiKeyValidationSchema,
  providerConfigSchema,
  providerKeyMappingSchema,
  providerNameSchema,
  providerSettingsSchema,
  providerStatusSchema,
} from "./contracts/providers"
export type {
  ApiKeyValidation,
  ProviderConfig,
  ProviderKeyMapping,
  ProviderSettings,
  ProviderStatus,
} from "./contracts/providers"
