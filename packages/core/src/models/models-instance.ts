/**
 * Models instance retrieval from execution context.
 *
 * This module provides access to the UserModels instance that's created
 * during workflow invocation. Each workflow gets its own UserModels instance
 * configured with appropriate API keys and model access.
 */

import { getExecutionContext, requireExecutionContext } from "@core/context/executionContext"
import type { UserModels } from "@lucky/models"

/**
 * Get the UserModels instance from execution context.
 *
 * @throws {Error} If no execution context is available
 * @throws {Error} If no UserModels instance is in the context
 */
export async function getModelsInstance(): Promise<UserModels> {
  const ctx = requireExecutionContext()

  const userModels = ctx.get("userModels")
  if (!userModels) {
    throw new Error(
      "No UserModels instance in execution context. " +
        "Ensure workflow is invoked through the API endpoint which sets up the models.",
    )
  }

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
