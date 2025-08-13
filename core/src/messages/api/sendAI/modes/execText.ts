/**
 * Text generation execution mode for sendAI.
 *
 * This module handles AI requests for pure text generation without
 * tool use or structured output requirements. It includes reasoning
 * support, timeout handling, and cost tracking.
 *
 * @module sendAI/modes/execText
 */

// TODO: implement text generation caching for repeated prompts
// TODO: add text quality metrics and scoring
// TODO: create text generation streaming support
// TODO: implement text length prediction and optimization
// TODO: add text generation performance analytics
// TODO: create contextual timeout adjustment based on prompt complexity
// TODO: implement text generation templates and reusable patterns
// TODO: add text output post-processing and formatting options

import { getLanguageModelWithReasoning } from "@core/messages/api/modelFactory"
import { normalizeError } from "@core/messages/api/sendAI/errors"
import { runWithStallGuard } from "@core/messages/api/stallGuard"
import { calculateUsageCost } from "@core/messages/api/vercel/pricing/vercelUsage"
import { lgg } from "@core/utils/logging/Logger"
import { saveResultOutput } from "@core/utils/persistence/saveResult"
import { SpendingTracker } from "@core/utils/spending/SpendingTracker"
import { CONFIG } from "@runtime/settings/constants"
import { getDefaultModels } from "@runtime/settings/models"
import { generateText, GenerateTextResult, ToolSet } from "ai"
import {
  getFallbackModel,
  shouldUseModelFallback,
  trackTimeoutForModel,
} from "../fallbacks"
import type { TextRequest, TResponse } from "../types"

const spending = SpendingTracker.getInstance()

/**
 * Executes AI requests for pure text generation.
 *
 * Handles text-only requests with support for reasoning models,
 * automatic fallback on model failures, and comprehensive timeout
 * protection. Includes cost tracking and result persistence.
 *
 * @param req - The text generation request
 * @returns Promise resolving to text response with optional reasoning
 */
// TODO: add prompt optimization and preprocessing
// TODO: implement text generation confidence scoring
// TODO: add text generation retry strategies with exponential backoff
// TODO: create text generation debugging and profiling tools
export async function execText(
  req: TextRequest
): Promise<TResponse<{ text: string; reasoning?: string }>> {
  const {
    messages,
    model: wanted = getDefaultModels().default,
    retries = 2,
    opts = {},
  } = req

  // TODO: add model capability validation for text generation
  // TODO: implement intelligent model selection based on prompt characteristics
  const modelName = shouldUseModelFallback(wanted)
    ? getFallbackModel(wanted)
    : wanted

  const model = getLanguageModelWithReasoning(modelName, opts)

  try {
    // TODO: add dynamic parameter optimization based on prompt analysis
    // TODO: implement request preprocessing for better results
    const baseOptions: Parameters<typeof generateText>[0] = {
      model,
      messages,
      maxRetries: retries,
      maxSteps: opts.maxSteps ?? CONFIG.tools.maxStepsVercel,
    }

    const isReasoning = Boolean(opts.reasoning)

    // TODO: implement adaptive timeout based on prompt complexity
    // TODO: add timeout prediction using historical data
    // TODO: create reasoning-aware performance optimization
    const gen = await runWithStallGuard<GenerateTextResult<ToolSet, any>>(
      baseOptions,
      {
        modelName: modelName,
        // text generations can reasonably take longer than 30s, especially with reasoning models.
        // use higher defaults and scale with reasoning flag.
        overallTimeoutMs: isReasoning ? 240_000 : 120_000,
        stallTimeoutMs: isReasoning ? 120_000 : 60_000,
      }
    )

    // TODO: add cost validation and budget alerting
    // TODO: implement cost optimization suggestions
    const usd = calculateUsageCost(gen.usage, modelName)
    if (opts.saveOutputs) await saveResultOutput(gen)
    spending.addCost(usd)

    // TODO: add text quality validation
    // TODO: implement response filtering and safety checks
    // TODO: add text generation metrics collection
    return gen.text
      ? {
          success: true,
          data: { text: gen.text, reasoning: gen.reasoning },
          usdCost: usd,
          error: null,
          debug_input: messages,
          debug_output: gen,
        }
      : {
          success: false,
          data: null,
          usdCost: usd,
          error: "Empty response",
          debug_input: messages,
          debug_output: gen,
        }
  } catch (err) {
    // TODO: implement comprehensive error classification system
    // TODO: add error recovery strategies beyond fallback
    // TODO: create error analytics and reporting
    const { message, debug } = normalizeError(err)
    lgg.error("execText error", message)

    // TODO: expand timeout detection to include more error patterns
    // TODO: implement model health monitoring beyond timeout tracking
    // track model timeouts to enable temporary fallback if a model times out frequently.
    if (
      typeof message === "string" &&
      (message.includes("Overall timeout") || message.includes("Stall timeout"))
    ) {
      trackTimeoutForModel(modelName)
    }

    // TODO: add error context and categorization
    // TODO: implement error-specific retry logic
    return {
      success: false,
      data: null,
      error: message,
      debug_input: messages,
      debug_output: debug,
    }
  }
}
