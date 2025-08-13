/**
 * Structured output execution mode for sendAI.
 *
 * This module handles AI requests that require structured data output
 * conforming to specific schemas. It validates output against provided
 * schemas and includes fallback and timeout handling.
 *
 * @module sendAI/modes/execStructured
 */

// TODO: add schema validation error recovery mechanisms
// TODO: implement structured output caching based on schema+input hash
// TODO: add schema evolution support (backwards compatibility)
// TODO: create structured output quality metrics
// TODO: implement partial result handling for large structured outputs
// TODO: add structured output compression for large responses
// TODO: create schema-specific timeout configurations
// TODO: implement structured output streaming for real-time updates

import { normalizeError } from "@core/messages/api/sendAI/errors"
import { SpendingTracker } from "@core/utils/spending/SpendingTracker"
import { getDefaultModels } from "@runtime/settings/models"
import pTimeout, { TimeoutError } from "p-timeout"
import type { ZodTypeAny } from "zod"
import { getFallbackModel, shouldUseModelFallback } from "../fallbacks"
import type { StructuredRequest, TResponse } from "../types"

const spending = SpendingTracker.getInstance()

/**
 * Executes AI requests requiring structured output conforming to schemas.
 *
 * Uses the genObject API to generate schema-compliant responses with
 * automatic fallback handling and timeout protection. Includes cost
 * tracking and comprehensive error handling.
 *
 * @template S - The Zod schema type for output validation
 * @param req - The structured generation request
 * @returns Promise resolving to typed structured response
 */
// TODO: add schema preprocessing and optimization
// TODO: implement structured output confidence scoring
// TODO: add schema-aware retry strategies
// TODO: create structured output debugging tools
export async function execStructured<S extends ZodTypeAny>(
  req: StructuredRequest<S>
): Promise<TResponse<import("zod").infer<S>>> {
  const { messages, model: modelIn, retries = 2, schema, opts = {} } = req

  // TODO: add request validation and preprocessing
  // TODO: implement schema complexity analysis for timeout adjustment
  const requestedModel = modelIn ?? getDefaultModels().default
  const model = shouldUseModelFallback(requestedModel)
    ? getFallbackModel(requestedModel)
    : requestedModel

  try {
    const { genObject } = await import("@core/messages/api/genObject")
    let genResult: Awaited<ReturnType<typeof genObject>>

    // TODO: make timeout configurable based on schema complexity
    // TODO: implement progressive timeout strategy
    // TODO: add timeout prediction based on historical data
    try {
      genResult = await pTimeout(
        genObject({
          messages,
          schema,
          model,
          opts: { ...opts, retries, repair: true },
        }),
        {
          milliseconds: 120_000,
          message: new Error(
            `Overall timeout (120 s) for ${model} – mode:structured`
          ),
        }
      )
    } catch (err) {
      // TODO: add timeout recovery strategies
      // TODO: implement partial result extraction from timeout errors
      if (err instanceof TimeoutError) {
        return {
          success: false,
          data: null,
          error: `Timeout error when calling ${model} – mode:structured`,
          debug_input: messages,
          debug_output: err,
        }
      }
      throw err
    }

    const { success, data, error, usdCost } = genResult

    if (!success) {
      // TODO: add structured error categorization
      // TODO: implement error-specific retry strategies
      return {
        success: false,
        data: null,
        error: error ?? "genObject error",
        debug_input: messages,
        debug_output: error,
      }
    }

    // TODO: add cost validation and alerting
    // TODO: implement structured output quality scoring
    spending.addCost(usdCost ?? 0)
    return {
      success: true,
      data: data.value,
      summary: data.summary,
      usdCost: usdCost ?? 0,
      error: null,
      debug_input: messages,
      debug_output: data as any,
    }
  } catch (err) {
    // TODO: add comprehensive error classification
    // TODO: implement error recovery mechanisms
    // TODO: add error reporting and analytics
    const { message, debug } = normalizeError(err)
    return {
      success: false,
      data: null,
      error: message || "Unknown error in execStructured",
      debug_input: messages,
      debug_output: debug,
    }
  }
}
