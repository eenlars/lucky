import { ErrorCodes } from "@lucky/contracts/invoke"
import type { JsonSchemaDefinition } from "@lucky/contracts/workflow"
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

/**
 * Creates a JSON-RPC error response for schema validation failure
 */
export function createSchemaValidationError(requestId: string | number, result: SchemaValidationResult) {
  return {
    jsonrpc: "2.0" as const,
    id: requestId,
    error: {
      code: ErrorCodes.INPUT_VALIDATION_FAILED,
      message: "Input validation failed",
      data: {
        errors:
          result.errors?.map(err => ({
            path: err.instancePath,
            message: err.message,
            params: err.params,
          })) || [],
        summary: result.errorMessage || formatValidationErrors(result.errors || []),
      },
    },
  }
}
