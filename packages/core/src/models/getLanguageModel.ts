/**
 * Language model retrieval with @lucky/models integration.
 * Drop-in replacement for the old modelFactory system.
 * Supports tier-based model selection.
 */

import type { LanguageModel } from "ai"
import type { ProviderOptions } from "@ai-sdk/provider-utils"
import { getModelsInstance } from "./models-instance"

/**
 * Get a language model with optional reasoning support.
 *
 * Applies provider-specific reasoning configurations when opts.reasoning is true:
 * - OpenRouter: unified `reasoning` parameter
 *   - Anthropic/Gemini thinking models: `{ max_tokens: 2048 }`
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
 * // Tier-based selection
 * const model = await getLanguageModelWithReasoning('cheap')
 *
 * // Specific model with reasoning
 * const model = await getLanguageModelWithReasoning('openai#gpt-4o', { reasoning: true })
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

  // Determine if reasoning is requested
  const wantsReasoning = Boolean(opts?.reasoning)

  // Build provider options for reasoning if needed
  let providerOptions: ProviderOptions | undefined

  if (wantsReasoning) {
    // Resolve to catalog ID to inspect provider and model name
    const modelId = models.resolve(modelName, { outputType: "string" })

    // Determine provider from model ID (format: "provider#model")
    const provider = modelId.split("#")[0]

    if (provider === "openrouter") {
      // OpenRouter reasoning configuration
      const isAnthropic = modelId.includes("anthropic/")
      const isGeminiThinking = modelId.includes("gemini") && (modelId.includes("thinking") || modelId.includes("think"))

      if (isAnthropic || isGeminiThinking) {
        providerOptions = { reasoning: { max_tokens: 2048 } as any }
      } else {
        providerOptions = { reasoning: { effort: "medium" } as any }
      }
    }
    // Other providers (OpenAI, Groq) don't have special reasoning configuration support yet
  }

  // Use models.resolve() which handles tier vs model routing
  // Pass through provider options (e.g., reasoning config for OpenRouter)
  return models.resolve(modelName, { providerOptions })
}
