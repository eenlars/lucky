/**
 * Tool Registration - Startup initialization
 *
 * This file provides helper functions to register tools with the code tool registry.
 * Call this once at application startup before using any tools.
 */

import { type CodeToolRegistry, codeToolRegistry } from "../registry/CustomToolRegistry"
import type { ToolkitRegistry } from "./customToolsRegistration"
import { printValidationResult, validateToolkitRegistration } from "./validation"

/**
 * Register all tools from the toolkits with validation
 */
export async function registerAllTools(
  toolkitRegistry: ToolkitRegistry,
  options?: { validate?: boolean; throwOnError?: boolean },
  registry: CodeToolRegistry = codeToolRegistry,
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
  registry.registerMany(allTools)

  // Mark registry as initialized
  await registry.initialize()

  console.log(`✅ Registered ${allTools.length} tools across ${toolkitRegistry.toolkits.length} toolkits`)
}

/**
 * Register tools from specific toolkits only
 */
export async function registerToolkits(
  toolkitRegistry: ToolkitRegistry,
  toolkitNames: readonly string[],
  options?: { registry?: CodeToolRegistry; validate?: boolean; throwOnError?: boolean },
): Promise<void> {
  const registry = options?.registry ?? codeToolRegistry
  const { validate = true, throwOnError = true } = options ?? {}

  const uniqueToolkitNames = [...new Set(toolkitNames)]
  if (uniqueToolkitNames.length !== toolkitNames.length) {
    console.warn("registerToolkits: duplicate toolkit names detected; using first occurrence only")
  }

  const missing = uniqueToolkitNames.filter(name => !toolkitRegistry.toolkits.some(t => t.toolkitName === name))
  if (missing.length > 0) {
    throw new Error(`No matching toolkits found for: ${missing.join(", ")}`)
  }

  const selectedToolkits = uniqueToolkitNames.map(name => toolkitRegistry.toolkits.find(t => t.toolkitName === name)!)
  const tools = selectedToolkits.flatMap(toolkit => toolkit.tools.map(t => t.toolFunc))

  if (validate) {
    const result = validateToolkitRegistration(selectedToolkits)
    printValidationResult("Code", result)

    if (!result.valid && throwOnError) {
      throw new Error("Tool registration validation failed. See errors above.")
    }
  }

  registry.registerMany(tools)
  await registry.initialize()

  console.log(`✅ Registered ${tools.length} tools from toolkits: ${toolkitNames.join(", ")}`)
}
