import type { JsonSchemaDefinition } from "@lucky/shared/contracts/workflow"
import { validateAgainstSchema } from "./json-schema-validation"

/**
 * Schema validation error
 */
export class SchemaValidationError extends Error {
  constructor(
    public readonly errorMessage: string,
    public readonly details: Array<{
      path: string
      message: string
      params?: unknown
    }>,
  ) {
    super(errorMessage)
    this.name = "SchemaValidationError"
  }
}

/**
 * Validate input data against a workflow's input schema (if defined).
 *
 * Used by both `/api/v1/invoke` and `/api/workflow/invoke` to ensure
 * workflow inputs conform to the schema defined on the workflow.
 *
 * @param input - Data to validate
 * @param inputSchema - JSON Schema to validate against (optional)
 * @throws {SchemaValidationError} If validation fails and schema is defined
 *
 * @example
 * validateWorkflowInputSchema(userInput, workflow.inputSchema)
 * // Throws if input doesn't match schema
 */
export function validateWorkflowInputSchema(input: unknown, inputSchema?: JsonSchemaDefinition): void {
  // Skip validation if no schema defined
  if (!inputSchema) {
    return
  }

  const result = validateAgainstSchema(input, inputSchema)

  if (!result.valid) {
    const errorDetails =
      result.errors?.map(err => ({
        path: err.instancePath || "input",
        message: err.message || "is invalid",
        params: err.params,
      })) || []

    throw new SchemaValidationError(result.errorMessage || "Input validation failed", errorDetails)
  }
}
