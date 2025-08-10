/**
 * Tool execution mode for sendAI.
 *
 * This module handles AI requests that involve tool calling and function
 * execution. It manages tool selection, argument validation, execution
 * timeouts, and error handling for multi-step tool interactions.
 *
 * @module sendAI/modes/execTool
 */

// TODO: implement tool execution caching for idempotent operations
// TODO: add tool performance monitoring and optimization
// TODO: create tool usage analytics and insights
// TODO: implement parallel tool execution for independent tools
// TODO: add tool execution sandboxing and security controls
// TODO: create tool result validation and post-processing
// TODO: implement tool execution retry strategies with backoff
// TODO: add tool execution workflow orchestration

import { getLanguageModelWithReasoning } from "@core/messages/api/modelFactory"
import { runWithStallGuard } from "@core/messages/api/stallGuard"
import { lgg } from "@core/utils/logging/Logger"
import { saveResultOutput } from "@core/utils/persistence/saveResult"
import { SpendingTracker } from "@core/utils/spending/SpendingTracker"
import { calculateUsageCost } from "@core/messages/api/vercel/pricing/vercelUsage"
import { CONFIG } from "@runtime/settings/constants"
import { getDefaultModels } from "@runtime/settings/models"
import { APICallError, generateText, GenerateTextResult, ToolSet } from "ai"
import { getFallbackModel, shouldUseModelFallback } from "../fallbacks"
import type { ToolRequest, TResponse } from "../types"

const spending = SpendingTracker.getInstance()

/**
 * Executes AI requests involving tool calling and function execution.
 *
 * Handles multi-step tool interactions with timeout protection,
 * argument validation, and comprehensive error handling. Supports
 * various tool choice strategies and execution patterns.
 *
 * @param req - The tool execution request
 * @returns Promise resolving to tool execution results
 */
// TODO: add tool capability analysis and optimization
// TODO: implement tool execution dependency resolution
// TODO: add tool execution debugging and profiling
// TODO: create tool execution security auditing
export async function execTool(
  req: ToolRequest
): Promise<TResponse<GenerateTextResult<ToolSet, any>>> {
  const { messages, model: modelIn, retries = 2, opts } = req
  const requestedModel = modelIn ?? getDefaultModels().default

  try {
    // TODO: add tool compatibility validation for model
    // TODO: implement smart tool selection based on model capabilities
    const modelName = shouldUseModelFallback(requestedModel)
      ? getFallbackModel(requestedModel)
      : requestedModel

    const model = getLanguageModelWithReasoning(modelName, opts)

    // TODO: add dynamic tool parameter optimization
    // TODO: implement tool execution planning and sequencing
    const baseOptions: Parameters<typeof generateText>[0] = {
      model,
      messages,
      maxRetries: retries,
      tools: opts.tools,
      toolChoice: opts.toolChoice,
      maxSteps: opts.maxSteps ?? CONFIG.tools.maxStepsVercel,
    }

    // TODO: implement adaptive timeouts based on tool complexity
    // TODO: add tool execution progress tracking
    // TODO: create tool-specific timeout configurations
    const gen = await runWithStallGuard<GenerateTextResult<ToolSet, any>>(
      baseOptions,
      {
        modelName: modelName,
        overallTimeoutMs: 300_000,
        stallTimeoutMs: 200_000,
      }
    )

    // TODO: add tool execution cost analysis and optimization
    // TODO: implement tool usage budgeting and alerts
    const usd = calculateUsageCost(gen.usage, modelName)
    if (opts.saveOutputs) await saveResultOutput(gen)
    spending.addCost(usd)

    // TODO: add tool execution result validation
    // TODO: implement tool result post-processing and formatting
    // TODO: create tool execution success metrics
    return {
      success: true,
      data: gen,
      usdCost: usd,
      error: null,
      debug_input: messages,
      debug_output: gen,
    }
  } catch (error: any) {
    // TODO: implement comprehensive tool error classification
    // TODO: add tool error recovery and fallback mechanisms
    // TODO: create tool error analytics and reporting

    // handle tool errors gracefully without dumping large stacks
    let message = ""
    const isArgValidationError =
      typeof error?.name === "string" &&
      (error.name.includes("AI_InvalidToolArgumentsError") ||
        error.name.includes("AI_TypeValidationError"))
    const isTypeValidationText =
      typeof error?.message === "string" &&
      error.message.toLowerCase().includes("type validation failed")

    // TODO: expand error categorization beyond validation errors
    // TODO: implement error-specific logging strategies
    if (!isArgValidationError && !isTypeValidationText) {
      // only log full details for unexpected errors
      lgg.error("execTool error", error, opts.toolChoice, opts.tools)
    } else {
      // keep logs concise for validation errors
      lgg.warn(
        `execTool validation error: ${error?.message ?? "invalid tool arguments"}`
      )
    }

    // TODO: implement structured error response parsing
    // TODO: add error response normalization
    if (APICallError.isInstance(error)) {
      if (error.responseBody) {
        try {
          const parsedError = JSON.parse(error.responseBody)
          if (parsedError?.error?.metadata?.raw) {
            message = JSON.parse(parsedError.error.metadata.raw)
          } else if (parsedError?.error?.message) {
            message = parsedError.error.message
          } else {
            message = parsedError?.message || error.message
          }
        } catch (parseError) {
          message = error.message
        }
      } else {
        message = error.message
      }
    } else {
      message = error.message
    }

    // TODO: add error context and debugging information
    // TODO: implement tool error recovery suggestions
    return {
      success: false,
      data: null,
      error: message,
      debug_input: messages,
      debug_output: error,
    }
  }
}
