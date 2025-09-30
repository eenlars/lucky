/**
 * @lucky/tools - Unified Tool Framework
 *
 * Provides a complete framework for creating, managing, and executing tools
 * for AI-powered workflows.
 */

// Factory - Tool creation and execution
export {
  defineTool,
  toAITool,
  commonSchemas,
  validateAndCorrectWithSchema,
  R,
  Tools,
} from "./factory/index.js"

export type {
  RS,
  ToolExecutionContext,
  InvocationContext,
  WorkflowFile,
  OutputSchema,
  CodeToolResult,
  CodeToolSuccess,
  CodeToolFailure,
} from "./factory/index.js"

// Registry - Tool types and filtering
export {
  getActiveTools,
  ACTIVE_MCP_TOOL_NAMES,
  ACTIVE_CODE_TOOL_NAMES,
  ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT,
  ALL_ACTIVE_TOOL_NAMES,
  ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_TOOLS_WITH_DESCRIPTION,
  INACTIVE_TOOLS,
} from "./registry/index.js"

export type { MCPToolName, CodeToolName, AllToolNames } from "./registry/index.js"

// Config - Tool metadata and settings
export { TOOLS, DEFAULT_TOOL_CONFIG } from "./config/index.js"
export type { ToolConfig } from "./config/index.js"
