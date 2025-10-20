import { logException } from "@/lib/error-logger"
import type { JsonSchemaDefinition } from "@lucky/shared/contracts/workflow"
import Ajv, { type ErrorObject, type ValidateFunction } from "ajv"

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false, // Allow flexibility in schema definitions
})

/**
 * Validation result wrapper
 */
export interface SchemaValidationResult {
  valid: boolean
  errors?: ErrorObject[]
  errorMessage?: string
}

/**
 * Validates data against a JSON Schema
 */
export function validateAgainstSchema(data: unknown, schema: JsonSchemaDefinition): SchemaValidationResult {
  try {
    const validate: ValidateFunction = ajv.compile(schema)
    const valid = validate(data)

    if (!valid) {
      return {
        valid: false,
        errors: validate.errors ?? [],
        errorMessage: ajv.errorsText(validate.errors),
      }
    }

    return { valid: true }
  } catch (error) {
    logException(error, {
      location: "/features/workflow-invocation/lib/json-schema-validation",
    })
    return {
      valid: false,
      errorMessage: error instanceof Error ? error.message : "Schema compilation failed",
    }
  }
}

/**
 * Formats validation errors into a user-friendly message
 */
export function formatValidationErrors(errors: ErrorObject[]): string {
  if (errors.length === 0) return "Invalid input"

  const messages = errors.map(err => {
    const path = err.instancePath || "input"
    const message = err.message || "is invalid"
    return `${path} ${message}`
  })

  return messages.join("; ")
}
