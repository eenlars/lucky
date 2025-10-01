/**
 * Client-safe exports from @lucky/tools
 *
 * This entry point ONLY includes types and constants that are safe to use in browser environments.
 * NO tool implementations, registries, or Node.js-specific code should be exported here.
 */

// Type definitions only
export type {
  MCPToolName,
  CodeToolName,
  AllToolNames,
} from "./registry/types"

export type { FlexibleToolDefinition } from "./registry/CodeToolRegistry"

// Constants (no runtime tool code)
export {
  ACTIVE_MCP_TOOL_NAMES,
  ACTIVE_CODE_TOOL_NAMES,
  ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT,
  ALL_ACTIVE_TOOL_NAMES,
  ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_TOOLS_WITH_DESCRIPTION,
  INACTIVE_TOOLS,
} from "./registry/types"

// Config metadata (no runtime code)
export { TOOLS, DEFAULT_TOOL_CONFIG } from "./config/index"
export type { ToolConfig } from "./config/index"

// Tool factory (browser-safe utilities)
export { defineTool, commonSchemas } from "./factory/index"
export type { ToolExecutionContext, InvocationContext } from "./factory/index"
