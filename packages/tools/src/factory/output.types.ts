/**
 * Re-export tool types from @lucky/shared for backward compatibility.
 * Tools is imported from main @lucky/shared (not /client) because it's a runtime helper used server-side.
 */

export type {
  CodeToolName,
  CodeToolFailure,
  CodeToolSuccess,
  CodeToolResult,
} from "@lucky/shared"
export type { Tools } from "@lucky/shared"
// Runtime default export for server-side usage
export { Tools as default } from "@lucky/shared"
