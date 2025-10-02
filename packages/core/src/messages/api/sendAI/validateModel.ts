/**
 * Runtime model validation for sendAI.
 * Validates that a model is active for the current provider.
 */

import { lgg } from "@core/utils/logging/Logger"
import { isActiveModel } from "@core/utils/spending/functions"
import type { ModelName } from "@core/utils/spending/models.types"
import { getCurrentProvider } from "@core/utils/spending/provider"

/**
 * Validates and resolves a model name to ensure it's active for the current provider.
 *
 * @param model - The model to validate (can be undefined)
 * @param fallback - Fallback model if model is undefined
 * @returns The resolved model name
 * @throws Error if the model is not active for the current provider
 */
export function validateAndResolveModel(model: ModelName | undefined, fallback: ModelName): ModelName {
  const resolved = model ?? fallback
  const provider = getCurrentProvider()

  if (!isActiveModel(resolved)) {
    const error = `Model "${resolved}" is not active for provider "${provider}". Check MODEL_CONFIG.inactive or model availability.`
    lgg.error(error, {
      model: resolved,
      provider,
      fallback,
    })
    throw new Error(error)
  }

  return resolved
}

/**
 * Check if a model is valid without throwing.
 * Useful for validation before execution.
 */
export function isValidModel(model: ModelName): boolean {
  return isActiveModel(model)
}
