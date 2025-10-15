/**
 * Tool Registration - Startup initialization
 *
 * This file provides helper functions to register tools with the code tool registry.
 * Call this once at application startup before using any tools.
 */

import { codeToolRegistry } from "../registry/CodeToolRegistry"
import type { ToolkitRegistry } from "./codeToolsRegistration"
import { printValidationResult, validateToolkitRegistration } from "./validation"

/**
 * Register all tools from the toolkits with validation
 */
export async function registerAllTools(
  toolkitRegistry: ToolkitRegistry,
  options?: { validate?: boolean; throwOnError?: boolean },
): Promise<void> {
  const { validate = true, throwOnError = true } = options ?? {}

  // Validate registration before registering
  if (validate) {
    const result = validateToolkitRegistration(toolkitRegistry.toolkits)
    printValidationResult("Code", result)

    if (!result.valid && throwOnError) {
      throw new Error("Tool registration validation failed. See errors above.")
    }
  }

  // Extract all tool functions from all toolkits
  const allTools = toolkitRegistry.toolkits.flatMap(toolkit => toolkit.tools.map(t => t.toolFunc))

  // Register them with the registry
  codeToolRegistry.registerMany(allTools)

  // Mark registry as initialized
  await codeToolRegistry.initialize()

  console.log(`✅ Registered ${allTools.length} tools across ${toolkitRegistry.toolkits.length} toolkits`)
}

/**
 * Register tools from specific toolkits only
 */
export async function registerToolkits(toolkitRegistry: ToolkitRegistry, ...toolkitNames: string[]): Promise<void> {
  const selectedToolkits = toolkitRegistry.toolkits.filter(t => toolkitNames.includes(t.toolkitName))
  const tools = selectedToolkits.flatMap(toolkit => toolkit.tools.map(t => t.toolFunc))

  codeToolRegistry.registerMany(tools)
  await codeToolRegistry.initialize()

  console.log(`✅ Registered ${tools.length} tools from toolkits: ${toolkitNames.join(", ")}`)
}
