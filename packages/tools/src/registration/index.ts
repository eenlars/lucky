/**
 * Tool Registration Module
 *
 * Exports all registration-related functionality for code and MCP tools
 */

// Code tools registration framework
export {
  createToolDefinition,
  createToolGroup,
  getAllTools,
  getToolsByGroup,
  getToolByName,
} from "./codeToolsRegistration"
export type {
  CodeToolDefinition,
  CodeToolGroup,
  CodeToolGroups,
} from "./codeToolsRegistration"

// MCP tools registration
export {
  mcpToolGroups,
  getAllMCPTools,
  getMCPToolsByGroup,
  getMCPToolByName,
  getAllMCPServerNames,
} from "./mcpToolsRegistration"
export type {
  MCPServerConfig,
  MCPToolDefinition,
  MCPToolGroup,
} from "./mcpToolsRegistration"

// Startup helpers
export { registerAllTools, registerToolGroups } from "./startup"

// Validation utilities
export {
  validateCodeToolRegistration,
  validateMCPToolRegistration,
  validateAllRegistrations,
  printValidationResult,
} from "./validation"
export type { ValidationResult } from "./validation"
