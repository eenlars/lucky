/**
 * Language model retrieval with @lucky/models integration.
 * Drop-in replacement for the old modelFactory system.
 * Supports tier-based model selection and provider-aware reasoning.
 */

import type { ModelName } from "@core/utils/spending/models.types"
import { getCurrentProvider } from "@core/utils/spending/provider"
import type { LanguageModel } from "ai"
import { getModelsInstance } from "./models-instance"
import { resolveTierOrModel, resolveTierToModel } from "./tier-resolver"

/**
 * Get a basic language model without reasoning support.
 * Supports both direct model names (provider/model) and tier names (nano, low, etc.).
 *
 * Special handling for OpenRouter:
 * - When current provider is OpenRouter, all models route through OpenRouter
 * - Model names like "openai/gpt-4" are passed as-is to OpenRouter
 *
 * @param modelName - Model name or tier name
 * @returns Promise resolving to AI SDK LanguageModel
 *
 * @example
 * ```ts
 * // Using tier name
 * const model = await getLanguageModel('high')
 *
 * // Using direct model name
 * const model = await getLanguageModel('openai/gpt-4')
 * ```
 */
export async function getLanguageModel(modelName: ModelName): Promise<LanguageModel> {
  const currentProvider = getCurrentProvider()
  const resolved = resolveTierOrModel(modelName)

  // Special handling for OpenRouter: route all models through OpenRouter
  if (currentProvider === "openrouter") {
    // If resolved is a model name (contains /), pass it to OpenRouter directly
    if (typeof resolved === "string" && resolved.includes("/")) {
      const models = await getModelsInstance()
      return await models.model({ provider: "openrouter", model: resolved })
    }
  }

  // For other providers or tier references, use standard resolution
  const models = await getModelsInstance()
  return await models.model(resolved)
}

/**
 * Get a language model with optional reasoning support.
 * Applies provider-specific reasoning configurations.
 *
 * Provider-specific behavior:
 * - OpenRouter: Uses unified `reasoning` parameter
 *   - Anthropic and Gemini thinking models: `{ max_tokens: 2048 }`
 *   - Other models: `{ effort: 'medium' }`
 * - OpenAI: Standard model (reasoning support TBD)
 * - Groq: No reasoning support (SDK limitation)
 *
 * @param modelName - Model name or tier name
 * @param opts - Options including reasoning flag
 * @returns Promise resolving to AI SDK LanguageModel
 *
 * @example
 * ```ts
 * // Get reasoning model
 * const model = await getLanguageModelWithReasoning('reasoning', { reasoning: true })
 *
 * // Regular model (reasoning flag off)
 * const model = await getLanguageModelWithReasoning('high')
 * ```
 */
export async function getLanguageModelWithReasoning(
  modelName: ModelName,
  opts?: { reasoning?: boolean },
): Promise<LanguageModel> {
  const provider = getCurrentProvider()
  const wantsReasoning = Boolean(opts?.reasoning)

  // If no reasoning needed, use basic retrieval
  if (!wantsReasoning) {
    return getLanguageModel(modelName)
  }

  // For reasoning, we need provider-specific handling
  // Since @lucky/models doesn't yet support passing reasoning options,
  // we get the model and recreate it with reasoning parameters

  const models = await getModelsInstance()
  const resolved = resolveTierOrModel(modelName)

  // Resolve tier to actual model name for provider-specific logic
  const actualModelName = resolveTierToModel(String(modelName)) || modelName
  const modelStr = String(actualModelName).toLowerCase()

  // Provider-specific reasoning configuration
  if (provider === "openrouter") {
    // Use async client factory for per-user API keys
    const { getOpenRouterClient } = await import("@core/clients/openrouter/openrouterClient")
    const openrouterClient = await getOpenRouterClient()

    const isAnthropic = modelStr.startsWith("anthropic/")
    const isGeminiThinking =
      modelStr.includes("gemini") && (modelStr.includes("thinking") || modelStr.includes("think"))

    if (isAnthropic || isGeminiThinking) {
      return openrouterClient(actualModelName, { reasoning: { max_tokens: 2048 } as any })
    }
    return openrouterClient(actualModelName, { reasoning: { effort: "medium" } as any })
  }

  if (provider === "openai") {
    // OpenAI reasoning support: for now, return standard model
    // TODO: Implement OpenAI-specific reasoning parameters when SDK supports it
    return models.model(resolved)
  }

  if (provider === "groq") {
    // Groq doesn't support reasoning parameters in their SDK
    return models.model(resolved)
  }

  // Fallback: use standard model
  return models.model(resolved)
}
