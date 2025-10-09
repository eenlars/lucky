/**
 * Language model retrieval with user-scoped API key resolution.
 * Properly uses @lucky/models architecture for provider management.
 */

import type { UserExecutionContext } from "@core/auth/types"
import type { ModelName } from "@core/utils/spending/models.types"
import { getCurrentProvider } from "@core/utils/spending/provider"
import type { LanguageModel } from "ai"
import { getModelsInstanceForUser } from "./models-instance"
import { resolveTierToModel } from "./tier-resolver"

/**
 * Get a language model with user-scoped API key resolution.
 * Uses @lucky/models architecture to handle provider routing and configuration.
 *
 * @param modelName - Model name or tier name (e.g., "high", "openai/gpt-4")
 * @param userContext - Optional user execution context for API key resolution
 * @returns Promise resolving to AI SDK LanguageModel
 * @throws Error if model not enabled or API key not configured
 *
 * @example
 * ```ts
 * // With user context (production)
 * const model = await getLanguageModel('high', userContext)
 *
 * // Without user context (dev/test)
 * const model = await getLanguageModel('high')
 *
 * // Direct model name
 * const model = await getLanguageModel('openai/gpt-4', userContext)
 * ```
 */
export async function getLanguageModel(
  modelName: ModelName,
  userContext?: UserExecutionContext,
): Promise<LanguageModel> {
  // Validate model access only if user has configured API keys
  // If no API keys configured, skip validation to allow environment fallback
  if (userContext) {
    const configuredProviders = await userContext.apiKeyResolver.getAllConfiguredProviders()

    if (configuredProviders.length > 0) {
      // User has configured API keys - validate model access
      const actualModelName = resolveTierToModel(String(modelName)) || modelName
      const hasAccess = await userContext.apiKeyResolver.validateModelAccess(actualModelName as string)

      if (!hasAccess) {
        throw new Error(
          `Model "${actualModelName}" is not enabled for your account. Please configure your API keys in provider settings.`,
        )
      }
    }
    // else: No configured providers - allow environment fallback
  }

  // Get Models instance with user-scoped API keys
  const models = await getModelsInstanceForUser(userContext)

  // Rewrite model spec to use CURRENT_PROVIDER when using OpenRouter
  // This ensures "openai/gpt-4" routes through OpenRouter, not OpenAI directly
  const currentProvider = getCurrentProvider()
  let modelSpec: string | { provider: string; model: string } = modelName as string

  if (currentProvider === "openrouter" && String(modelName).includes("/")) {
    // Extract model name without provider prefix
    const fullModelName = String(modelName)
    modelSpec = {
      provider: "openrouter",
      model: fullModelName, // Keep full name like "openai/gpt-4"
    }
  }

  // Use Models to resolve and return the language model
  return await models.model(modelSpec)
}

/**
 * Get a language model with optional reasoning support.
 * Note: Reasoning configuration currently handled by Models package.
 *
 * @param modelName - Model name or tier name
 * @param opts - Options including reasoning flag and user context
 * @returns Promise resolving to AI SDK LanguageModel
 * @throws Error if model not enabled or API key not configured
 *
 * @example
 * ```ts
 * // Get reasoning model with user context
 * const model = await getLanguageModelWithReasoning('reasoning', {
 *   reasoning: true,
 *   userContext
 * })
 * ```
 */
export async function getLanguageModelWithReasoning(
  modelName: ModelName,
  opts?: { reasoning?: boolean; userContext?: UserExecutionContext },
): Promise<LanguageModel> {
  // For now, reasoning is handled within the Models package or by the caller
  // We simply return the base model - reasoning parameters can be passed when calling AI SDK
  return getLanguageModel(modelName, opts?.userContext)
}
