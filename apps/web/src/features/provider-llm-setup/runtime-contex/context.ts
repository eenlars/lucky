import { requireExecutionContext } from "@lucky/core/context/executionContext"
import type { UserModels } from "@lucky/models"

/**
 * Get the LLMRegistry instance from execution context
 *
 * The registry is used to create user-specific model instances throughout the workflow.
 * It is configured at the start of workflow execution with either shared company keys
 * or user-specific keys (BYOK).
 *
 * @throws Error if no execution context exists or registry not configured
 * @returns LLMRegistry instance for this workflow execution
 *
 * @example
 * ```typescript
 * const userModels = getUserModels()
 * const userModels = registry.forUser({
 *   mode: "shared",
 *   userId: "user-123",
 *   models: ["gpt-4o", "llama-3.1-70b"]
 * })
 * const model = userModels.model("gpt-4o")
 * ```
 */
export function getUserModelsFromContext(): UserModels {
  const ctx = requireExecutionContext()
  const principal = ctx.get("principal")

  if (!principal) {
    throw new Error(
      "No principal in execution context. " +
        "Ensure workflow is invoked through the API endpoint which sets up authentication.",
    )
  }

  const userModels = ctx.get("userModels")
  if (!userModels) {
    throw new Error(
      "UserModels not configured in execution context. Ensure userModels is passed to withExecutionContext()",
    )
  }
  return userModels
}
