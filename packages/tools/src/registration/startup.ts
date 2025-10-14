/**
 * Tool Registration - Startup initialization
 *
 * This file provides helper functions to register tools with the code tool registry.
 * Call this once at application startup before using any tools.
 */

import { type CodeToolRegistry, codeToolRegistry } from "../registry/CodeToolRegistry"
import type { CodeToolGroups } from "./codeToolsRegistration"
import { printValidationResult, validateCodeToolRegistration } from "./validation"

/**
 * Register all tools from the tool groups with validation
 */
export async function registerAllTools(
  toolGroups: CodeToolGroups,
  options?: { validate?: boolean; throwOnError?: boolean },
  registry: CodeToolRegistry = codeToolRegistry,
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
  registry.registerMany(allTools)

  // Mark registry as initialized
  await registry.initialize()

  console.log(`✅ Registered ${allTools.length} tools across ${toolGroups.groups.length} groups`)
}

/**
 * Register tools from specific groups only
 */
export async function registerToolGroups(
  toolGroups: CodeToolGroups,
  groupNames: readonly string[],
  options?: { registry?: CodeToolRegistry; validate?: boolean; throwOnError?: boolean },
): Promise<void> {
  const registry = options?.registry ?? codeToolRegistry
  const { validate = true, throwOnError = true } = options ?? {}

  const uniqueGroupNames = [...new Set(groupNames)]
  if (uniqueGroupNames.length !== groupNames.length) {
    console.warn("registerToolGroups: duplicate group names detected; using first occurrence only")
  }

  const missing = uniqueGroupNames.filter(name => !toolGroups.groups.some(g => g.groupName === name))
  if (missing.length > 0) {
    throw new Error(`No matching tool groups found for: ${missing.join(", ")}`)
  }

  const selectedGroups = uniqueGroupNames.map(name => toolGroups.groups.find(g => g.groupName === name)!)
  const tools = selectedGroups.flatMap(group => group.tools.map(t => t.toolFunc))

  if (validate) {
    const result = validateCodeToolRegistration(selectedGroups)
    printValidationResult("Code", result)

    if (!result.valid && throwOnError) {
      throw new Error("Tool registration validation failed. See errors above.")
    }
  }

  registry.registerMany(tools)
  await registry.initialize()

  console.log(`✅ Registered ${tools.length} tools from groups: ${groupNames.join(", ")}`)
}
