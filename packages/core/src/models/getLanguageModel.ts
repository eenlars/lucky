/**
 * Language model retrieval with @lucky/models integration.
 * Drop-in replacement for the old modelFactory system.
 * Supports tier-based model selection and provider-aware reasoning.
 */

import { getCurrentProvider } from "@core/utils/spending/provider"
import { getOpenRouterClient } from "@lucky/core/clients/gateways/openrouter/openrouterClient"
import type { LanguageModel } from "ai"
import { getModelsInstance } from "./models-instance"

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
 * @param modelName - Model name, tier name (cheap/fast/smart/balanced), or catalog ID
 * @param opts - Options including reasoning flag
 * @returns Promise resolving to AI SDK LanguageModel
 *
 * @example
 * ```ts
 * // Get reasoning model
 * const model = await getLanguageModelWithReasoning('reasoning', { reasoning: true })
 *
 * // Tier-based selection
 * const model = await getLanguageModelWithReasoning('cheap')
 *
 * // Specific model
 * const model = await getLanguageModelWithReasoning('openai#gpt-4o')
 * ```
 */
export async function getLanguageModelWithReasoning(
  modelName: string,
  opts?: { reasoning?: boolean },
): Promise<LanguageModel> {
  const provider = getCurrentProvider()
  const wantsReasoning = Boolean(opts?.reasoning)

  // For reasoning, we need provider-specific handling
  // Since @lucky/models doesn't yet support passing reasoning options,
  // we get the model and recreate it with reasoning parameters

  const models = await getModelsInstance()

  if (!modelName) {
    throw new Error("Model name is not set")
  }

  // For non-reasoning requests, use models.resolve() which handles tier vs model routing
  if (!wantsReasoning || provider !== "openrouter") {
    return models.resolve(modelName)
  }

  // OpenRouter reasoning: need to bypass models.resolve() and use custom client
  // because reasoning config must be passed during model creation
  const openrouterClient = await getOpenRouterClient()

  const isAnthropic = modelName.includes("anthropic/")
  const isGeminiThinking =
    modelName.includes("gemini") && (modelName.includes("thinking") || modelName.includes("think"))

  if (isAnthropic || isGeminiThinking) {
    return openrouterClient(modelName, { reasoning: { max_tokens: 2048 } as any })
  }
  return openrouterClient(modelName, { reasoning: { effort: "medium" } as any })
}
