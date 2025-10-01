import type { CodeToolName } from "@lucky/tools"
import { ACTIVE_CODE_TOOL_NAMES } from "@lucky/tools"

/**
 * Get all available code tool names
 * This is an async function for compatibility with the auto-discovery system
 */
export async function getAllCodeToolNames(): Promise<CodeToolName[]> {
  return ACTIVE_CODE_TOOL_NAMES
}
