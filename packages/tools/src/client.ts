/**
 * Client-safe exports from @lucky/tools
 *
 * This entry point ONLY includes types and constants that are safe to use in browser environments.
 * NO tool implementations, registries, or Node.js-specific code should be exported here.
 */

// Type definitions only
export type { AllToolNames, CodeToolName, MCPToolName } from "./registry/types"

export type { FlexibleToolDefinition } from "./registry/CustomToolRegistry"

// Constants (no runtime tool code)
export {
  ACTIVE_CODE_TOOL_NAMES,
  ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT,
  ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_MCP_TOOL_NAMES,
  ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_TOOLS_WITH_DESCRIPTION,
  ALL_ACTIVE_TOOL_NAMES,
  INACTIVE_TOOLS,
} from "./registry/types"

// Config metadata (no runtime code)
export {
  DEFAULT_INACTIVE_TOOLS,
  TOOLS,
} from "@lucky/shared/contracts/tools"

// Tool factory types only (no runtime code - defineTool/commonSchemas pulled in @lucky/shared main bundle with Node.js deps)
export type { InvocationContext, ToolExecutionContext } from "./factory/types"
