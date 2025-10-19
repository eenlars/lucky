import type { InvocationInput } from "@lucky/core/workflow/runner/types"
import type { WorkflowConfig } from "@lucky/shared/contracts/workflow"
import { SchemaValidationError, validateWorkflowInputSchema } from "./schema-validator"

/**
 * Validate invocation input against workflow's input schema.
 *
 * Handles different evalInput types:
 * - "mcp-invoke": Validates inputData against schema
 * - "text": Input is question/answer (no schema validation needed)
 * - "prompt-only": Input is goal (no schema validation needed)
 * - Other types: No validation
 *
 * @param input - Invocation input with evalInput
 * @param workflowConfig - Workflow config (may have inputSchema)
 * @throws {SchemaValidationError} If validation fails
 *
 * @example
 * validateInvocationInputSchema(input, workflowConfig)
 * // Throws if mcp-invoke input doesn't match schema
 */
export function validateInvocationInputSchema(input: InvocationInput, workflowConfig: WorkflowConfig | null): void {
  // Only validate mcp-invoke inputs against schema
  if (input.evalInput?.type === "mcp-invoke" && workflowConfig?.inputSchema) {
    validateWorkflowInputSchema(input.evalInput.inputData, workflowConfig.inputSchema)
  }

  // Other input types (prompt-only, text, csv, etc.) don't require schema validation
  // They're validated by their respective evaluation systems
}
