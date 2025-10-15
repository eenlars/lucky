/**
 * Validation utilities for tool registration
 *
 * Ensures that tool registrations are valid and match their definitions
 */

import type { ToolkitDefinition } from "./codeToolsRegistration"
import type { MCPToolkit } from "./mcpToolsRegistration"

/**
 * Validation result
 */
export type ValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate code toolkit registration
 */
export function validateToolkitRegistration(toolkits: ToolkitDefinition[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const seenNames = new Set<string>()
  const seenToolkitNames = new Set<string>()

  for (const toolkit of toolkits) {
    // Check toolkit name is unique
    if (seenToolkitNames.has(toolkit.toolkitName)) {
      errors.push(`Duplicate toolkit name: ${toolkit.toolkitName}`)
    }
    seenToolkitNames.add(toolkit.toolkitName)

    // Check toolkit has description
    if (!toolkit.description || toolkit.description.trim().length === 0) {
      errors.push(`Toolkit ${toolkit.toolkitName} is missing a description`)
    }

    // Check toolkit has tools
    if (!toolkit.tools || toolkit.tools.length === 0) {
      warnings.push(`Toolkit ${toolkit.toolkitName} has no tools`)
    }

    for (const tool of toolkit.tools) {
      // Check tool name is unique across all toolkits
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
 * Validate MCP toolkit registration
 */
export function validateMCPToolkitRegistration(toolkits: MCPToolkit[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const seenNames = new Set<string>()
  const seenToolkitNames = new Set<string>()
  const seenServerNames = new Set<string>()

  for (const toolkit of toolkits) {
    // Check toolkit name is unique
    if (seenToolkitNames.has(toolkit.toolkitName)) {
      errors.push(`Duplicate toolkit name: ${toolkit.toolkitName}`)
    }
    seenToolkitNames.add(toolkit.toolkitName)

    // Check toolkit has description
    if (!toolkit.description || toolkit.description.trim().length === 0) {
      errors.push(`Toolkit ${toolkit.toolkitName} is missing a description`)
    }

    // Check toolkit has tools
    if (!toolkit.tools || toolkit.tools.length === 0) {
      warnings.push(`Toolkit ${toolkit.toolkitName} has no tools`)
    }

    for (const tool of toolkit.tools) {
      // Check tool name is unique across all toolkits
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
  codeToolkits: ToolkitDefinition[],
  mcpToolkits: MCPToolkit[],
  throwOnError = true,
): boolean {
  const codeResult = validateToolkitRegistration(codeToolkits)
  const mcpResult = validateMCPToolkitRegistration(mcpToolkits)

  printValidationResult("Code", codeResult)
  printValidationResult("MCP", mcpResult)

  const allValid = codeResult.valid && mcpResult.valid

  if (!allValid && throwOnError) {
    throw new Error("Tool registration validation failed. See errors above.")
  }

  return allValid
}
