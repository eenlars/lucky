/**
 * Language model retrieval with @lucky/models integration.
 * Drop-in replacement for the old modelFactory system.
 * Supports tier-based model selection.
 */

import type { LanguageModel } from "ai"
import { getModelsInstance } from "./models-instance"

/**
 * Get a language model with optional reasoning support.
 *
 * TODO: Re-implement provider-specific reasoning configurations once
 * UserModels supports custom provider parameters:
 * - OpenRouter: unified `reasoning` parameter
 *   - Anthropic/Gemini thinking models: `{ max_tokens: 2048 }`
 *   - Other models: `{ effort: 'medium' }`
 * - OpenAI: Standard model (reasoning support TBD)
 * - Groq: No reasoning support (SDK limitation)
 *
 * @param modelName - Model name, tier name (cheap/fast/smart/balanced), or catalog ID
 * @param opts - Options including reasoning flag (currently ignored)
 * @returns Promise resolving to AI SDK LanguageModel
 *
 * @example
 * ```ts
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
  const models = await getModelsInstance()

  if (!modelName) {
    throw new Error("Model name is not set")
  }

  // Use models.resolve() which handles tier vs model routing
  // Note: reasoning parameter is currently ignored until UserModels supports it
  return models.resolve(modelName)
}
