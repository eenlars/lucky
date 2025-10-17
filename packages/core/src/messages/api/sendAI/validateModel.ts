/**
 * Runtime model validation for sendAI.
 * Validates that a model is active for the current provider.
 */

import { lgg } from "@core/utils/logging/Logger"
import { isActiveModel } from "@core/utils/spending/functions"
import { findModel } from "@lucky/models"

/**
 * Validates and resolves a model name to ensure it's active for the current provider.
 *
 * @param model - The model to validate (can be undefined)
 * @param fallback - Fallback model if model is undefined
 * @returns The resolved model name
 * @throws Error if the model is not active for the current provider
 */
export function validateAndResolveModel(model: string | undefined, fallback: string): string {
  const resolved = model ?? fallback

  // Skip validation in development to allow testing all models
  if (process.env.NODE_ENV === "development") {
    return resolved
  }

  if (!isActiveModel(resolved)) {
    // Extract provider from model entry for better error message
    const modelEntry = findModel(resolved)
    const provider = modelEntry?.provider || "unknown"

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
export function isValidModel(model: string): boolean {
  return isActiveModel(model)
}
