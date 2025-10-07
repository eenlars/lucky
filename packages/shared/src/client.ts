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
