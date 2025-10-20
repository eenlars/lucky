/**
 * Models instance retrieval from execution context.
 *
 * This module provides access to the UserModels instance created from the
 * LLMRegistry stored in execution context. Each workflow gets access to models
 * configured with appropriate API keys and access controls.
 */

import { getExecutionContext, getUserModelsFromContext, requireExecutionContext } from "@core/context/executionContext"
import type { UserModels } from "@lucky/models"

/**
 * Get the UserModels instance from execution context.
 *
 * Creates a UserModels instance from the LLMRegistry in execution context,
 * configured for the current principal with all runtime-enabled models.
 *
 * @throws {Error} If no execution context is available
 * @throws {Error} If no LLMRegistry instance is in the context
 */
export async function getModelsInstance(): Promise<UserModels> {
  const ctx = requireExecutionContext()
  const principal = ctx.get("principal")

  if (!principal) {
    throw new Error(
      "No principal in execution context. " +
        "Ensure workflow is invoked through the API endpoint which sets up authentication.",
    )
  }

  const userModels = getUserModelsFromContext()

  return userModels
}

/**
 * Reset the cached models instance (useful for testing).
 * @deprecated No longer uses singleton pattern - kept for backward compatibility
 */
export function resetModelsInstance(): void {
  const ctx = getExecutionContext()
  if (ctx) {
    ctx.delete("userModels")
  }
}
