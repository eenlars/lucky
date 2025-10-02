/**
 * Validation utilities for tool registration
 *
 * Ensures that tool registrations are valid and match their definitions
 */

import type { CodeToolDefinition, CodeToolGroup } from "./codeToolsRegistration"
import type { MCPToolDefinition, MCPToolGroup } from "./mcpToolsRegistration"

/**
 * Validation result
 */
export type ValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate code tool registration
 */
export function validateCodeToolRegistration(groups: CodeToolGroup[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const seenNames = new Set<string>()
  const seenGroupNames = new Set<string>()

  for (const group of groups) {
    // Check group name is unique
    if (seenGroupNames.has(group.groupName)) {
      errors.push(`Duplicate group name: ${group.groupName}`)
    }
    seenGroupNames.add(group.groupName)

    // Check group has description
    if (!group.description || group.description.trim().length === 0) {
      errors.push(`Group ${group.groupName} is missing a description`)
    }

    // Check group has tools
    if (!group.tools || group.tools.length === 0) {
      warnings.push(`Group ${group.groupName} has no tools`)
    }

    for (const tool of group.tools) {
      // Check tool name is unique across all groups
      if (seenNames.has(tool.toolName)) {
        errors.push(`Duplicate tool name: ${tool.toolName}`)
      }
      seenNames.add(tool.toolName)

      // Check tool has description
      if (!tool.description || tool.description.trim().length === 0) {
        errors.push(`Tool ${tool.toolName} is missing a description`)
      }

      // Check tool has function
      if (!tool.toolFunc) {
        errors.push(`Tool ${tool.toolName} is missing toolFunc`)
      }

      // Check tool function has required properties
      if (tool.toolFunc) {
        if (!tool.toolFunc.name) {
          warnings.push(`Tool ${tool.toolName}: toolFunc is missing 'name' property`)
        }
        if (!tool.toolFunc.description) {
          warnings.push(`Tool ${tool.toolName}: toolFunc is missing 'description' property`)
        }
        if (!tool.toolFunc.parameters) {
          warnings.push(`Tool ${tool.toolName}: toolFunc is missing 'parameters' property`)
        }
        if (!tool.toolFunc.execute || typeof tool.toolFunc.execute !== "function") {
          errors.push(`Tool ${tool.toolName}: toolFunc is missing 'execute' function`)
        }

        // Warn if registration name doesn't match tool function name
        if (tool.toolFunc.name && tool.toolFunc.name !== tool.toolName) {
          warnings.push(
            `Tool name mismatch: registration uses '${tool.toolName}' but toolFunc.name is '${tool.toolFunc.name}'`,
          )
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate MCP tool registration
 */
export function validateMCPToolRegistration(groups: MCPToolGroup[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const seenNames = new Set<string>()
  const seenGroupNames = new Set<string>()
  const seenServerNames = new Set<string>()

  for (const group of groups) {
    // Check group name is unique
    if (seenGroupNames.has(group.groupName)) {
      errors.push(`Duplicate group name: ${group.groupName}`)
    }
    seenGroupNames.add(group.groupName)

    // Check group has description
    if (!group.description || group.description.trim().length === 0) {
      errors.push(`Group ${group.groupName} is missing a description`)
    }

    // Check group has tools
    if (!group.tools || group.tools.length === 0) {
      warnings.push(`Group ${group.groupName} has no tools`)
    }

    for (const tool of group.tools) {
      // Check tool name is unique across all groups
      if (seenNames.has(tool.toolName)) {
        errors.push(`Duplicate tool name: ${tool.toolName}`)
      }
      seenNames.add(tool.toolName)

      // Track server names
      seenServerNames.add(tool.serverName)

      // Check tool has description
      if (!tool.description || tool.description.trim().length === 0) {
        errors.push(`Tool ${tool.toolName} is missing a description`)
      }

      // Check tool has server name
      if (!tool.serverName || tool.serverName.trim().length === 0) {
        errors.push(`Tool ${tool.toolName} is missing serverName`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Print validation result
 */
export function printValidationResult(type: "Code" | "MCP", result: ValidationResult): void {
  if (result.valid) {
    console.log(`✅ ${type} tool registration is valid`)
  } else {
    console.error(`❌ ${type} tool registration has errors:`)
    result.errors.forEach(err => console.error(`  - ${err}`))
  }

  if (result.warnings.length > 0) {
    console.warn(`⚠️  ${type} tool registration warnings:`)
    result.warnings.forEach(warn => console.warn(`  - ${warn}`))
  }
}

/**
 * Validate all registrations and throw if invalid
 */
export function validateAllRegistrations(
  codeGroups: CodeToolGroup[],
  mcpGroups: MCPToolGroup[],
  throwOnError = true,
): boolean {
  const codeResult = validateCodeToolRegistration(codeGroups)
  const mcpResult = validateMCPToolRegistration(mcpGroups)

  printValidationResult("Code", codeResult)
  printValidationResult("MCP", mcpResult)

  const allValid = codeResult.valid && mcpResult.valid

  if (!allValid && throwOnError) {
    throw new Error("Tool registration validation failed. See errors above.")
  }

  return allValid
}
