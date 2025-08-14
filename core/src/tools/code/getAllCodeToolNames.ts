import type { CodeToolName } from "@core/tools/tool.types"
import { ACTIVE_CODE_TOOL_NAMES } from "@core/tools/tool.types"

/**
 * Get all available code tool names
 * This is an async function for compatibility with the auto-discovery system
 */
export async function getAllCodeToolNames(): Promise<CodeToolName[]> {
  return ACTIVE_CODE_TOOL_NAMES
}
