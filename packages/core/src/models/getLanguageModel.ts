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
  modelName: string,
  opts?: { reasoning?: boolean },
): Promise<LanguageModel> {
  const provider = getCurrentProvider()
  const wantsReasoning = Boolean(opts?.reasoning)

  // For reasoning, we need provider-specific handling
  // Since @lucky/models doesn't yet support passing reasoning options,
  // we get the model and recreate it with reasoning parameters

  const models = await getModelsInstance()
  const normalized = modelName

  if (!normalized) {
    throw new Error("Model name is not set")
  }

  // Provider-specific reasoning configuration
  if (provider === "openrouter") {
    // Use async client factory for per-user API keys
    const openrouterClient = await getOpenRouterClient()

    const isAnthropic = normalized.startsWith("anthropic/")
    const isGeminiThinking =
      normalized.includes("gemini") && (normalized.includes("thinking") || normalized.includes("think"))

    if ((isAnthropic || isGeminiThinking) && wantsReasoning) {
      return openrouterClient(normalized, { reasoning: { max_tokens: 2048 } as any })
    }
    return openrouterClient(normalized, { reasoning: { effort: "medium" } as any })
  }

  if (provider === "openai") {
    // OpenAI reasoning support: for now, return standard model
    // TODO: Implement OpenAI-specific reasoning parameters when SDK supports it
    return models.model(normalized)
  }

  if (provider === "groq") {
    // Groq doesn't support reasoning parameters in their SDK
    return models.model(normalized)
  }

  // Fallback: use standard model
  return models.model(normalized)
}
