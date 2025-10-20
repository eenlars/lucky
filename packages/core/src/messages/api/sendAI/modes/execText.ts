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

import { getCoreConfig, getDefaultModels } from "@core/core-config/coreConfig"
import { normalizeError } from "@core/messages/api/sendAI/errors"
import { retryWithBackoff } from "@core/messages/api/sendAI/utils/retry"
import { runWithStallGuard } from "@core/messages/api/stallGuard"
import { calculateUsageCost } from "@core/messages/api/vercel/pricing/vercelUsage"
import { getModelsInstance } from "@core/models/models-instance"
import { logException } from "@core/utils/error-tracking/errorLogger"
import { lgg } from "@core/utils/logging/Logger"
import { saveResultOutput } from "@core/utils/persistence/saveResult"
import { getCurrentProvider } from "@core/utils/spending/provider"
import { getSpendingTracker } from "@core/utils/spending/trackerContext"
import { isNir } from "@lucky/shared"
import { type GenerateTextResult, type ToolSet, type generateText, stepCountIs } from "ai"
import { getFallbackModel, shouldUseModelFallback, trackTimeoutForModel } from "../fallbacks"
import type { TResponse, TextRequest } from "../types"

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
export async function execText(req: TextRequest): Promise<TResponse<{ text: string; reasoning?: string }>> {
  const { messages, model: wanted = getDefaultModels().default, retries = 2, opts: rawOpts = {} } = req

  // Normalize opts to handle null/undefined - must be done before any property access
  const opts = rawOpts || {}
  const config = getCoreConfig()

  // TODO: add model capability validation for text generation
  // TODO: implement intelligent model selection based on prompt characteristics
  const modelName: string = shouldUseModelFallback(wanted) ? getFallbackModel(wanted) : wanted

  const models = await getModelsInstance()
  const model = models.resolve(modelName)

  try {
    // TODO: add dynamic parameter optimization based on prompt analysis
    // TODO: implement request preprocessing for better results
    const baseOptions: Parameters<typeof generateText>[0] = {
      model,
      messages,
      // Let the SDK retry thrown/transient errors once per attempt; we handle empty-response retries below
      maxRetries: Math.max(0, Math.min(retries, 1)),
      stopWhen: stepCountIs(opts.maxSteps ?? config.tools.maxStepsVercel),
    }

    const isReasoning = Boolean(opts.reasoning)

    const overallTimeoutMs = isReasoning ? 240_000 : 120_000
    const stallTimeoutMs = isReasoning ? 120_000 : 60_000

    const attempts = Math.max(1, (retries ?? 0) + 1)
    const attemptsDebug: Array<{
      attempt: number
      reason: string
      usage?: any
      provider: string
      model: string
    }> = []

    const attemptOnce = async () => {
      const gen = await runWithStallGuard<GenerateTextResult<ToolSet, any>>(baseOptions, {
        modelName: modelName,
        overallTimeoutMs,
        stallTimeoutMs,
      })

      const usd = calculateUsageCost(gen?.usage, modelName)
      if (opts.saveOutputs && gen) await saveResultOutput(gen)
      getSpendingTracker().addCost(usd)
      return gen
    }

    const result = await retryWithBackoff(attemptOnce, {
      attempts,
      backoffMs: 300,
      shouldRetry: gen => {
        const text = gen?.text
        const hasText = !isNir(text?.trim?.())
        if (!hasText) {
          attemptsDebug.push({
            attempt: attemptsDebug.length + 1,
            reason: "empty-text",
            usage: gen?.usage,
            provider: String(getCurrentProvider()),
            model: String(modelName),
          })
          lgg.warn(
            `execText empty response (attempt ${attemptsDebug.length}/${attempts}) from ${String(
              getCurrentProvider(),
            )} for ${String(modelName)}`,
          )
        }
        return !hasText
      },
    })

    const usd = calculateUsageCost(result?.usage, modelName)
    const text = result?.text
    const hasText = !isNir(text?.trim?.())
    if (hasText) {
      return {
        success: true,
        data: { text, reasoning: result?.reasoningText },
        usdCost: usd,
        error: null,
        debug_input: messages,
        debug_output: result,
      }
    }

    return {
      success: false,
      data: null,
      usdCost: usd,
      error: `Empty response from ${String(getCurrentProvider())} for model ${String(modelName)} after ${attempts} attempt(s).`,
      debug_input: messages,
      debug_output: { lastGen: result, attempts: attemptsDebug },
    }
  } catch (err) {
    console.error("execText error", JSON.stringify(err, null, 2))
    // TODO: implement comprehensive error classification system
    // TODO: add error recovery strategies beyond fallback
    // TODO: create error analytics and reporting
    const { message, debug } = normalizeError(err)

    // Enhanced error logging with full context for debugging
    const provider = getCurrentProvider()
    const errorContext = {
      provider,
      model: modelName,
      error: message,
      debug,
      requestInfo: {
        messageCount: messages.length,
        hasReasoning: Boolean(opts.reasoning),
        maxSteps: opts.maxSteps ?? config.tools.maxStepsVercel,
        retries,
      },
    }

    // Determine severity and category based on error type
    let severity: "error" | "warn" = "error"
    let errorCategory = "unknown"
    let isUserError = false

    // Categorize errors to reduce noise for user input errors
    if (typeof message === "string") {
      const lowerMsg = message.toLowerCase()

      // User input validation errors - don't spam logs
      if (
        lowerMsg.includes("is not a valid model id") ||
        lowerMsg.includes("does not exist") ||
        lowerMsg.includes("model_not_found") ||
        lowerMsg.includes("model not found") ||
        (debug?.statusCode === 400 && (lowerMsg.includes("model") || lowerMsg.includes("invalid")))
      ) {
        errorCategory = "validation"
        severity = "warn"
        isUserError = true
        lgg.warn(`⚠️  Invalid model: ${modelName} - ${message}`)
      } else if (lowerMsg.includes("quota") || lowerMsg.includes("insufficient credits")) {
        errorCategory = "quota"
        severity = "error"
        lgg.error(`💰 QUOTA ERROR: ${provider} - ${message}`)
        lgg.error(`   Model: ${modelName}`)
        lgg.error("   This usually means your API key has reached its usage limit.")
        lgg.error("   Check your billing settings at your provider's dashboard.")
      } else if (lowerMsg.includes("authentication") || lowerMsg.includes("api key")) {
        errorCategory = "auth"
        severity = "error"
        lgg.error(`🔑 AUTH ERROR: ${provider} - ${message}`)
        lgg.error("   Model: ${modelName}")
        lgg.error("   Check that your API key is set correctly and has the right permissions.")
      } else if (message.includes("Overall timeout") || message.includes("Stall timeout")) {
        errorCategory = "timeout"
        severity = "warn"
      } else if (lowerMsg.includes("rate limit")) {
        errorCategory = "rate_limit"
        severity = "warn"
      } else {
        // Unknown errors - log full context for debugging
        lgg.error("❌ execText failed", JSON.stringify(errorContext, null, 2))
      }
    } else {
      // Non-string errors - log full context
      lgg.error("❌ execText failed", JSON.stringify(errorContext, null, 2))
    }

    // Only log to backend for non-user errors
    if (!isUserError) {
      logException(err, {
        location: `core/execText/${errorCategory}`,
        context: {
          ...errorContext,
          errorCategory,
        },
        severity,
      }).catch(logErr => {
        // Never let logging errors disrupt execution
        console.error("Failed to log error to backend:", logErr)
      })
    }

    // TODO: expand timeout detection to include more error patterns
    // TODO: implement model health monitoring beyond timeout tracking
    // track model timeouts to enable temporary fallback if a model times out frequently.
    if (typeof message === "string" && (message.includes("Overall timeout") || message.includes("Stall timeout"))) {
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
