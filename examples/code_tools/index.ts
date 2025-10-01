/**
 * Code Tools - Re-exports from @lucky/tools
 *
 * This directory now serves as a compatibility layer,
 * re-exporting tools from the @lucky/tools package.
 *
 * All tool implementations live in packages/tools/src/definitions/
 */

import { registerAllTools, type FlexibleToolDefinition } from "@lucky/tools"
import { ALL_TOOLS, TOOL_GROUPS } from "./registry"

/**
 * Setup all code tools by registering them with the registry
 */
export async function setupCodeTools(): Promise<FlexibleToolDefinition[]> {
  await registerAllTools(TOOL_GROUPS)
  return ALL_TOOLS
}

/**
 * Discover all available tools
 * @deprecated Use registerAllTools() from @lucky/tools instead
 */
export async function discoverTools(): Promise<FlexibleToolDefinition[]> {
  return ALL_TOOLS
}

// Re-export for backward compatibility
export { ALL_TOOLS }

// Re-export everything from @lucky/tools for convenience
export * from "@lucky/tools"
