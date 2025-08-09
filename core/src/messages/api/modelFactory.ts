import { openai } from "@ai-sdk/openai"
import { groqProvider } from "@core/utils/clients/groq/groqClient"
import { openrouter } from "@core/utils/clients/openrouter/openrouterClient"
import type { ModelName } from "@core/utils/spending/models.types"
import {
  CURRENT_PROVIDER,
  type LuckyProvider,
} from "@core/utils/spending/provider"
import { LanguageModelV1 } from "ai"

/**
 * Base: map `ModelName` to a provider-bound `LanguageModelV1` without extras.
 */
export function getLanguageModel(modelName: ModelName): LanguageModelV1 {
  const provider = CURRENT_PROVIDER as LuckyProvider
  if (provider === "openrouter") return openrouter(modelName)
  if (provider === "groq") return groqProvider(modelName)
  if (provider === "openai") return openai(modelName)
  return openrouter(modelName)
}

/**
 * Provider-aware reasoning wrapper.
 *
 * - OpenRouter: use unified `reasoning` parameter
 *   - Anthropic and Gemini thinking: `{ max_tokens: 2048 }`
 *   - Others: `{ effort: 'medium' }`
 * - OpenAI: `{ reasoningEffort: 'medium' }`
 * - Groq: no-op (SDK does not expose reasoning controls)
 */
export function getLanguageModelWithReasoning(
  modelName: ModelName,
  opts?: { reasoning?: boolean }
): LanguageModelV1 {
  const provider = CURRENT_PROVIDER as LuckyProvider
  const wantsReasoning = Boolean(opts?.reasoning)

  if (provider === "openrouter") {
    if (!wantsReasoning) return openrouter(modelName)

    const modelStr = String(modelName).toLowerCase()
    const isAnthropic = modelStr.startsWith("anthropic/")
    const isGeminiThinking =
      modelStr.includes("gemini") &&
      (modelStr.includes("thinking") || modelStr.includes("think"))

    if (isAnthropic || isGeminiThinking) {
      return openrouter(modelName, { reasoning: { max_tokens: 2048 } as any })
    }
    return openrouter(modelName, { reasoning: { effort: "medium" } as any })
  }

  if (provider === "openai") {
    return wantsReasoning
      ? openai(modelName, { reasoningEffort: "medium" })
      : openai(modelName)
  }

  if (provider === "groq") {
    return groqProvider(modelName)
  }

  return openrouter(modelName)
}
