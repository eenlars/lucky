/**
 * Tool Registration - Startup initialization
 *
 * This file provides helper functions to register tools with the code tool registry.
 * Call this once at application startup before using any tools.
 */

import { codeToolRegistry } from "../registry/CodeToolRegistry"
import type { CodeToolGroups } from "./codeToolsRegistration"
import { printValidationResult, validateCodeToolRegistration } from "./validation"

/**
 * Register all tools from the tool groups with validation
 */
export async function registerAllTools(
  toolGroups: CodeToolGroups,
  options?: { validate?: boolean; throwOnError?: boolean },
): Promise<void> {
  const { validate = true, throwOnError = true } = options ?? {}

  // Validate registration before registering
  if (validate) {
    const result = validateCodeToolRegistration(toolGroups.groups)
    printValidationResult("Code", result)

    if (!result.valid && throwOnError) {
      throw new Error("Tool registration validation failed. See errors above.")
    }
  }

  // Extract all tool functions from all groups
  const allTools = toolGroups.groups.flatMap(group => group.tools.map(t => t.toolFunc))

  // Register them with the registry
  codeToolRegistry.registerMany(allTools)

  // Mark registry as initialized
  await codeToolRegistry.initialize()

  console.log(`✅ Registered ${allTools.length} tools across ${toolGroups.groups.length} groups`)
}

/**
 * Register tools from specific groups only
 */
export async function registerToolGroups(toolGroups: CodeToolGroups, ...groupNames: string[]): Promise<void> {
  const selectedGroups = toolGroups.groups.filter(g => groupNames.includes(g.groupName))
  const tools = selectedGroups.flatMap(group => group.tools.map(t => t.toolFunc))

  codeToolRegistry.registerMany(tools)
  await codeToolRegistry.initialize()

  console.log(`✅ Registered ${tools.length} tools from groups: ${groupNames.join(", ")}`)
}
