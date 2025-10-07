// Public API surface (browser-safe only)
// Node.js-only exports (csv, fs) are available via subpath exports:
//   - @lucky/shared/fs
//   - @lucky/shared/csv

// Browser-safe utilities
export * from "./utils/files/json/jsonParse"
export * from "./utils/common/isNir"
export * from "./utils/common/id"
export * from "./utils/common/array"
export * from "./utils/zod/withDescriptions"

// Result type and helper
export type { RS } from "./types/result.types"
export { R } from "./types/result.types"

// Types
export type {
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./types/database.types"
export type {
  StandardizedLocation,
  LocationData,
  PartialLocationData,
  WorkflowLocationData,
} from "./types/location.types"
export {
  DataQuality,
  locationDataSchema,
  exampleLocationData,
} from "./types/location.types"
export type {
  CodeToolName,
  CodeToolFailure,
  CodeToolSuccess,
  CodeToolResult,
} from "./types/tool.types"
export { Tools } from "./types/tool.types"
