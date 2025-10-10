/**
 * @lucky/tools - Unified Tool Framework
 *
 * Provides a complete framework for creating, managing, and executing tools
 * for AI-powered workflows.
 */

// Factory - Tool creation and execution
export { defineTool, toAITool, commonSchemas } from "./factory/toolFactory"
export { validateAndCorrectWithSchema } from "./factory/validation"
export {
  R,
  type RS,
  type InvocationContext,
  type OutputSchema,
} from "./factory/types"
export type {
  CodeToolResult,
  CodeToolSuccess,
  CodeToolFailure,
} from "@lucky/shared"

// Registry - Tool types, filtering, and management
export {
  type MCPToolName,
  type CodeToolName,
  type AllToolNames,
  getActiveTools,
  ACTIVE_MCP_TOOL_NAMES,
  ACTIVE_CODE_TOOL_NAMES,
  ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT,
  ALL_ACTIVE_TOOL_NAMES,
  ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_TOOLS_WITH_DESCRIPTION,
  INACTIVE_TOOLS,
} from "./registry/types"
export {
  CodeToolRegistry,
  codeToolRegistry,
  type FlexibleToolDefinition,
} from "./registry/CodeToolRegistry"
export { setupCodeToolsForNode } from "./registry/codeToolsSetup"
export { getAllCodeToolNames } from "./registry/getAllCodeToolNames"

// Config - Tool metadata and settings
export {
  TOOLS,
  DEFAULT_INACTIVE_TOOLS,
  type MCPToolName as ConfigMCPToolName,
  type CodeToolName as ConfigCodeToolName,
  type AllToolNames as ConfigAllToolNames,
} from "@lucky/shared/contracts/tools"

// MCP - Model Context Protocol client
export { MCPClientManager, type MCPClientConfig, type MCPConfig } from "./mcp/mcp"
export { getMCPTools, type MCPToolInfo } from "./mcp/getMCPTools"

// Registration - Tool registration and startup
export {
  createToolDefinition,
  createToolGroup,
  getAllTools,
  getToolsByGroup,
  getToolByName,
  type CodeToolDefinition,
  type CodeToolGroup,
  type CodeToolGroups,
} from "./registration/codeToolsRegistration"
export {
  mcpToolGroups,
  getAllMCPTools,
  getMCPToolsByGroup,
  getMCPToolByName,
  getAllMCPServerNames,
  type MCPServerConfig,
  type MCPToolDefinition,
  type MCPToolGroup,
} from "./registration/mcpToolsRegistration"
export { registerAllTools, registerToolGroups } from "./registration/startup"
export {
  validateCodeToolRegistration,
  validateMCPToolRegistration,
  validateAllRegistrations,
  printValidationResult,
  type ValidationResult,
} from "./registration/validation"

// Schemas - Shared type definitions
export {
  DataQuality,
  locationDataSchema,
  exampleLocationData,
  type StandardizedLocation,
  type LocationData,
  type PartialLocationData,
  type WorkflowLocationData,
} from "./schemas/location.types"

// Tool execution context from contracts
export type {
  ToolExecutionContext,
  ToolRegistry,
  ITool,
  WorkflowFile,
} from "@lucky/shared/contracts/tools"

// Utils - Schema detection and helpers
export { isZodSchema, isVercelAIStructure } from "./utils/index"
