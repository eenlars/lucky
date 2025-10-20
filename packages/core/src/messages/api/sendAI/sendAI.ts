/* -------------------------------------------------------------------------- */
/*                           sendAI public module                             */
/* -------------------------------------------------------------------------- */

/**
 * Main API module for sending requests to AI models.
 *
 * This module provides a unified interface for interacting with various AI models
 * through different modes: text generation, tool use, and structured output.
 * It includes built-in guards for rate limiting and spending control.
 *
 * @module sendAI
 */

// TODO: add comprehensive error tracking and reporting system
// TODO: implement request/response caching mechanism for repeated queries
// TODO: add support for streaming responses
// TODO: implement request prioritization queue
// TODO: add model-specific optimizations and configurations
// TODO: create performance monitoring and alerting system
// TODO: add support for batch processing multiple requests
// TODO: implement automatic model fallback chain
// TODO: add request deduplication to prevent duplicate API calls
// TODO: create comprehensive audit logging for all AI interactions

import { getDefaultModels } from "@core/core-config/coreConfig"
import { normalizeError } from "@core/messages/api/sendAI/errors"

import { rateLimit, spendingGuard } from "@core/messages/api/sendAI/guards"
import { execStructured } from "@core/messages/api/sendAI/modes/execStructured"
import { execText } from "@core/messages/api/sendAI/modes/execText"
import { execTool } from "@core/messages/api/sendAI/modes/execTool"
import type { SendAI, StructuredRequest, TextRequest, ToolRequest } from "@core/messages/api/sendAI/types"

/**
 * Internal implementation of sendAI that handles request validation,
 * guard checks, and delegation to mode-specific handlers.
 *
 * @param req - The AI request (text, tool, or structured mode)
 * @returns Promise resolving to the AI response or error result
 */
async function _sendAIInternal(req: TextRequest | ToolRequest | StructuredRequest<any>): Promise<any> {
  /* ---- global guard‑rails ---- */
  // TODO: make guard checks configurable per environment
  // TODO: add custom guard rules based on model type
  const spendErr = spendingGuard()
  if (spendErr)
    return {
      success: false,
      data: null,
      error: spendErr,
      debug_input: req.messages,
    }

  const rateErr = rateLimit()
  if (rateErr)
    return {
      success: false,
      data: null,
      error: rateErr,
      debug_input: req.messages,
    }

  /* ---- validate input ---- */
  // TODO: add more sophisticated content validation
  // TODO: implement input sanitization for security
  // TODO: add validation for message roles and structure
  if (
    !req.messages?.length ||
    !req.messages.some(m =>
      typeof m.content === "string" ? m.content.trim() : Array.isArray(m.content) ? m.content.length : false,
    )
  ) {
    return {
      success: false,
      data: null,
      error: "Input must have at least 1 token.",
      debug_input: req.messages,
    }
  }

  /* ---- normalize model ---- */
  // Use default model if none specified
  req.model = req.model ?? getDefaultModels().default

  if (req.model.includes("#")) {
    const [_provider, model] = req.model.split("#")
    req.model = model
  }

  /* ---- delegate to mode‑specific helper ---- */
  switch (req.mode) {
    case "text":
      return execText(req)
    case "tool":
      return execTool(req)
    case "structured":
      return execStructured(req)
    default: {
      const _exhaustiveCheck: never = req as never
      void _exhaustiveCheck
      return {
        success: false,
        data: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: `Unknown mode ${(req as any).mode}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        debug_input: req as any,
      }
    }
  }
}

/**
 * Normalizes various error shapes (plain Error, AI SDK errors, unknown) into a
 * concise message plus a serializable debug object. Avoids JSON.stringify on
 * raw Error instances (which drops details) and captures useful provider info.
 */
// moved to dedicated module ./errors

/**
 * Main public interface for sending requests to AI models.
 *
 * This function provides error handling, caller tracking, and timing metrics
 * around the core sendAI functionality. It automatically captures the calling
 * file for debugging purposes and handles all exceptions gracefully.
 *
 * @param req - The AI request (text, tool, or structured mode)
 * @returns Promise resolving to standardized response format
 */
export const sendAI: SendAI = async (req: TextRequest | ToolRequest | StructuredRequest<any>) => {
  // TODO: optimize caller detection performance
  // TODO: add request correlation IDs for distributed tracing
  // TODO: implement proper structured logging instead of console.error

  // log which file is requesting sendAI by inspecting the stack trace
  const stack = new Error().stack
  let callerFile = ""
  if (stack) {
    // find the first stack line outside this file
    const lines = stack.split("\n")
    for (const line of lines) {
      if (line.includes(".ts") && !line.includes("sendAI.ts") && !line.includes("/sendAI/index.ts")) {
        // try to extract the file path
        const match = line.match(/(?:\()?(.*?\.ts):\d+:\d+\)?/)
        if (match?.[1]) {
          callerFile = match[1]
          break
        }
      }
    }
  }
  // extract (avoid logging absolute paths)

  try {
    const start = Date.now()
    const result = await (async () => {
      // Global guard to prevent indefinite hangs across any mode
      const { default: pTimeout } = await import("p-timeout")
      return await pTimeout(_sendAIInternal(req), {
        milliseconds: 150_000,
        message: new Error("Global sendAI timeout (150 s)"),
      })
    })()
    const end = Date.now()
    const duration = end - start

    // TODO: implement proper performance metrics collection
    // TODO: add performance alerting for slow requests
    // if (req.debug)
    // lgg.info(
    //   `sendAI duration for model ${req.model ?? "unknown"}: ${duration}ms`
    // )
    void duration
    return result
  } catch (error) {
    const extractedFileName = callerFile?.split("/").pop()
    // TODO: replace console.error with proper logging system
    // TODO: add error categorization and severity levels
    // eslint-disable-next-line no-console
    {
      const { message, debug } = normalizeError(error)
      console.error(`sendAI error ${extractedFileName}: ${message}`)
      return {
        success: false,
        data: null,
        error: message || `Unknown error in sendAI ${extractedFileName}`,
        debug_input: req.messages ?? [],
        debug_output: debug,
      }
    }
  }
}

/**
 * Normalizes model names for consistent database storage and comparison.
 *
 * Ensures all model names are stored in a consistent string format
 * with trimmed whitespace to prevent storage inconsistencies.
 *
 * @param modelName - The model name to normalize
 * @returns Normalized string representation of the model name
 */
// TODO: add model name validation against known models
// TODO: implement model name alias resolution
// TODO: add deprecation warnings for old model names
export const normalizeModelName = (modelName: string): string => {
  // ensure consistent string format and trim any whitespace
  return String(modelName).trim()
}
