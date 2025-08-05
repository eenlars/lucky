/**
 * Generic validation and auto-correction layer that uses Zod schema validation
 * as the single source of truth. No hardcoded constraints.
 */

import type { ZodSchema } from "zod"
import type { CoreContext } from "../utils/config/logger"

/**
 * Validates and auto-corrects tool parameters using the tool's Zod schema.
 * This acts as a safety net for when AI models ignore JSON schema constraints.
 */
export function validateAndCorrectWithSchema<T>(
  coreContext: CoreContext,
  toolName: string,
  params: Record<string, any>,
  schema: ZodSchema<T>
): { params: Record<string, any>; corrected: boolean; warnings: string[] } {
  const { logger } = coreContext
  const validationResult = schema.safeParse(params)

  if (validationResult.success) {
    // All parameters are valid, no correction needed
    return { params, corrected: false, warnings: [] }
  }

  // Validation failed, attempt auto-correction for correctable issues
  const correctedParams = { ...params }
  const warnings: string[] = []
  let corrected = false

  for (const issue of validationResult.error.issues) {
    const paramPath = issue.path.join(".")
    const paramName = issue.path[0] as string
    const originalValue = params[paramName]

    if (
      issue.code === "too_big" &&
      issue.type === "number" &&
      typeof issue.maximum === "number"
    ) {
      // Auto-correct values that exceed maximum
      correctedParams[paramName] = issue.maximum
      corrected = true

      const warning = `Tool ${toolName}: Parameter '${paramPath}' value ${originalValue} exceeds maximum ${issue.maximum}. Auto-corrected to ${issue.maximum}.`
      warnings.push(warning)
      logger.warn("Auto-correcting tool parameter", {
        toolName,
        parameter: paramPath,
        originalValue,
        correctedValue: issue.maximum,
        reason: issue.message,
        issueCode: issue.code,
      })
    } else if (
      issue.code === "too_small" &&
      issue.type === "number" &&
      typeof issue.minimum === "number"
    ) {
      // Auto-correct values below minimum
      correctedParams[paramName] = issue.minimum
      corrected = true

      const warning = `Tool ${toolName}: Parameter '${paramPath}' value ${originalValue} below minimum ${issue.minimum}. Auto-corrected to ${issue.minimum}.`
      warnings.push(warning)
      logger.warn("Auto-correcting tool parameter", {
        toolName,
        parameter: paramPath,
        originalValue,
        correctedValue: issue.minimum,
        reason: issue.message,
        issueCode: issue.code,
      })
    } else {
      // Log uncorrectable validation issues
      logger.error("Uncorrectable validation issue", {
        toolName,
        parameter: paramPath,
        value: originalValue,
        issue: issue.message,
        issueCode: issue.code,
      })

      warnings.push(
        `Tool ${toolName}: Uncorrectable validation issue for '${paramPath}': ${issue.message}`
      )
    }
  }

  if (corrected) {
    // Re-validate corrected parameters to ensure they're now valid
    const revalidation = schema.safeParse(correctedParams)
    if (!revalidation.success) {
      logger.error("Auto-correction failed - parameters still invalid", {
        toolName,
        originalParams: params,
        correctedParams,
        remainingIssues: revalidation.error.issues,
      })

      // Return original params with warning about failed correction
      warnings.push(
        `Tool ${toolName}: Auto-correction failed, remaining validation issues exist`
      )
      return { params, corrected: false, warnings }
    }
  }

  return { params: correctedParams, corrected, warnings }
}
