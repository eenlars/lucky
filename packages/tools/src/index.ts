/**
 * @lucky/tools - Unified Tool Framework
 *
 * Provides a complete framework for creating, managing, and executing tools
 * for AI-powered workflows.
 */

// Factory - Tool creation and execution
export type {
  CodeToolFailure,
  CodeToolResult,
  CodeToolSuccess,
} from "@lucky/shared"
export { commonSchemas, defineTool, toAITool } from "./factory/toolFactory"
export {
  R,
  type InvocationContext,
  type OutputSchema,
  type RS,
} from "./factory/types"
export { validateAndCorrectWithSchema } from "./factory/validation"

// Registry - Tool types, filtering, and management
export { setupCodeToolsForNode } from "./registry/codeToolsSetup"
export {
  CodeToolRegistry,
  codeToolRegistry,
  createCodeToolRegistry,
  type FlexibleToolDefinition,
} from "./registry/CustomToolRegistry"
export { getAllCodeToolNames } from "./registry/getAllCodeToolNames"
export {
  ACTIVE_CODE_TOOL_NAMES,
  ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT,
  ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_MCP_TOOL_NAMES,
  ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_TOOLS_WITH_DESCRIPTION,
  ALL_ACTIVE_TOOL_NAMES,
  getActiveTools,
  INACTIVE_TOOLS,
  type AllToolNames,
  type CodeToolName,
  type MCPToolName,
} from "./registry/types"

// Config - Tool metadata and settings
export {
  DEFAULT_INACTIVE_TOOLS,
  TOOLS,
  type AllToolNames as ConfigAllToolNames,
  type CodeToolName as ConfigCodeToolName,
  type MCPToolName as ConfigMCPToolName,
} from "@lucky/shared/contracts/tools"

// MCP - Model Context Protocol client
export { getMCPTools, type MCPToolInfo } from "./mcp/getMCPTools"
export {
  clearMCPClientCache,
  clearWorkflowMCPClientCache,
  getMCPStatus,
  logMCPStatus,
  setupMCPForNode,
} from "./mcp/setup"

// Registration - Tool registration and startup
export {
  createCustomToolDefinition,
  createToolkit,
  getAllCustomToolsByToolkit,
  getCustomToolByName,
  getCustomToolsByToolkit,
  type CustomToolDefinition,
  type ToolkitDefinition,
  type ToolkitRegistry,
} from "./registration/customToolsRegistration"
export {
  LocalMCPRegistry,
  type LocalMCPRegistryConfig,
  type LocalMCPRegistryOptions,
  type LocalMCPRegistrySnapshot,
  type LocalMCPServer,
  type LocalMCPTool,
  type LocalMCPTransport,
  type LocalMCPTransportOAuth,
  type LocalMCPTransportStdio,
} from "./registration/localMCP"
export { registerAllTools, registerToolkits } from "./registration/startup"
export {
  getAllMCPServerNames,
  getAllMCPTools,
  getMCPToolByName,
  getMCPToolsByToolkit,
  mcpToolkits,
  type MCPServerConfig,
} from "./registration/mcpToolsRegistration"

// Tool execution context from contracts
export type {
  ITool,
  ToolExecutionContext,
  ToolRegistry,
  WorkflowFile,
} from "@lucky/shared/contracts/tools"

// Utils - Schema detection and helpers
export { isVercelAIStructure, isZodSchema } from "./utils/schemaDetection"
