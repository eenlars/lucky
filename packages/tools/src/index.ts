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

// Registry - Tool types, filtering, and management
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
  CodeToolRegistry,
  codeToolRegistry,
  setupCodeToolsForNode,
  getAllCodeToolNames,
} from "./registry/index.js"

export type {
  MCPToolName,
  CodeToolName,
  AllToolNames,
  FlexibleToolDefinition,
} from "./registry/index.js"

// Config - Tool metadata and settings
export { TOOLS, DEFAULT_TOOL_CONFIG } from "./config/index.js"
export type { ToolConfig } from "./config/index.js"

// MCP - Model Context Protocol client
export { MCPClientManager, getMCPTools } from "./mcp/index.js"
export type { MCPClientConfig, MCPConfig, MCPToolInfo } from "./mcp/index.js"

// Registration - Tool registration and startup
export {
  toolGroups,
  getAllTools,
  getToolsByGroup,
  getToolByName,
  mcpToolGroups,
  getAllMCPTools,
  getMCPToolsByGroup,
  getMCPToolByName,
  getAllMCPServerNames,
  registerAllTools,
  registerToolGroups,
  validateCodeToolRegistration,
  validateMCPToolRegistration,
  validateAllRegistrations,
  printValidationResult,
} from "./registration/index.js"

export type {
  CodeToolDefinition,
  CodeToolGroup,
  MCPServerConfig,
  MCPToolDefinition,
  MCPToolGroup,
  ValidationResult,
} from "./registration/index.js"

// Schemas - Shared type definitions
export {
  DataQuality,
  locationDataSchema,
  exampleLocationData,
  type StandardizedLocation,
  type LocationData,
  type PartialLocationData,
  type WorkflowLocationData,
} from "./schemas/index.js"

// Runtime Config - Configurable paths and settings
export {
  getToolRuntimeConfig,
  setToolRuntimeConfig,
  PATHS,
  MODELS,
  CONFIG,
  type ToolRuntimePaths,
  type ToolRuntimeModels,
  type ToolRuntimeConfig,
} from "./config/runtime.js"

// Default export for backward compatibility (Tools utility)
export { default } from "./factory/output.types.js"
