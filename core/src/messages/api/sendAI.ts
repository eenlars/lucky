/* -------------------------------------------------------------------------- */
/*                       AI Gateway – one function, three modes                */
/* -------------------------------------------------------------------------- */
/*
 * This file is the **single entry-point** for every LLM call in the codebase.
 * It hides three messy realities behind one calm façade:
 *
 * 1. Provider gymnastics  (OpenAI ↔ OpenRouter ↔ Groq)
 * 2. Spending & rate limits (hard-capped in real time)
 * 3. Stall detection    (kill a call that goes silent for N ms)
 *
 * Use it like:
 *
 *   const ok = await sendAI({ mode:'text', messages:[...] })
 *   if(ok.success) console.log(ok.data.text)
 *
 * Every returned object has the same shape – success, data, cost, debug.
 * Nothing else needs to import `openai`, `groq`, or any model string.
 */

import {
  APICallError,
  CoreMessage,
  GenerateTextResult,
  LanguageModelV1,
  StepResult,
  ToolChoice,
  ToolSet,
  type generateText,
} from "ai"
import { z, ZodTypeAny, type Schema } from "zod"

import pTimeout, { TimeoutError } from "p-timeout"

import { getLanguageModelWithReasoning } from "@core/messages/api/modelFactory"
import { runWithStallGuard } from "@core/messages/api/stallGuard"
import { lgg } from "@core/utils/logging/Logger"
import { saveResultOutput } from "@core/utils/persistence/saveResult"
import type { ModelName } from "@core/utils/spending/models.types"
import { ModelNameV2 } from "@core/utils/spending/models.types"
// provider selection handled in modelFactory
import { SpendingTracker } from "@core/utils/spending/SpendingTracker"
import { calculateUsageCost } from "@core/utils/spending/vercel/vercelUsage"
import { CONFIG } from "@runtime/settings/constants"
import { getDefaultModels } from "@runtime/settings/models"

/* -------------------------------------------------------------------------- */
/*                               Public types                                 */
/* -------------------------------------------------------------------------- */

export type TResponse<T> =
  | {
      success: true
      data: T
      summary?: string
      usdCost: number
      error: null
      debug_input: CoreMessage[]
      debug_output: any
    }
  | {
      success: false
      data: null
      summary?: string
      usdCost?: number
      error: string
      debug_input: CoreMessage[]
      debug_output: any
    }

export type PreparedStepsFunction<
  T extends ToolSet = ToolSet,
  M extends LanguageModelV1 = LanguageModelV1,
> = (o: {
  steps: StepResult<T>[]
  stepNumber: number
  maxSteps: number
  model: M
}) => PromiseLike<
  | {
      model?: M
      toolChoice?: ToolChoice<T>
      experimental_activeTools?: (keyof T)[]
    }
  | undefined
>

/* ---------------------------- Base request shape -------------------------- */

interface RequestBase {
  messages: CoreMessage[]
  debug?: boolean
  model?: ModelName
  retries?: number
  opts?: {
    saveOutputs?: boolean
    maxSteps?: number
    reasoning?: boolean
  }
}

/* ---------------------------- Output variants ----------------------------- */

export interface TextRequest extends RequestBase {
  mode: "text"
}

export interface ToolRequest extends RequestBase {
  mode: "tool"
  opts: RequestBase["opts"] & {
    tools: ToolSet
    toolChoice?: ToolChoice<ToolSet>
    repair?: boolean
  }
}

export interface StructuredRequest<S extends z.ZodTypeAny | Schema<any>>
  extends RequestBase {
  mode: "structured"
  schema: S
  output?: "object" | "array"
  enum?: readonly string[]
}

type SendAI = (<S extends ZodTypeAny>(
  req: StructuredRequest<S>
) => Promise<TResponse<z.infer<S>>>) &
  ((req: ToolRequest) => Promise<TResponse<GenerateTextResult<ToolSet, any>>>) &
  ((
    req: TextRequest
  ) => Promise<TResponse<{ text: string; reasoning?: string }>>)

/* -------------------------------------------------------------------------- */
/*                       Global utilities & guard‑rails                       */
/* -------------------------------------------------------------------------- */

const spending = SpendingTracker.getInstance()
const RATE_WINDOW_MS = CONFIG.limits.rateWindowMs
const MAX_REQUESTS_PER_WINDOW = CONFIG.limits.maxRequestsPerWindow

const hitTimestamps: number[] = []
function rateLimit(): string | null {
  const now = Date.now()
  while (hitTimestamps.length && now - hitTimestamps[0] > RATE_WINDOW_MS)
    hitTimestamps.shift()
  if (hitTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return `sendAI: Rate limit exceeded: ${MAX_REQUESTS_PER_WINDOW} req / ${RATE_WINDOW_MS} ms`
  }
  hitTimestamps.push(now)
  return null
}

function spendingGuard(): string | null {
  if (!CONFIG.limits.enableSpendingLimits) return null
  if (spending.canMakeRequest()) return null
  const { currentSpend, spendingLimit } = spending.getStatus()
  return `Spending limit exceeded: $${currentSpend.toFixed(
    2
  )} / $${spendingLimit.toFixed(2)}`
}

/* ---------- model‑timeout tracking (unchanged – still informative) -------- */

const modelTimeouts = new Map<ModelName, number[]>()
const TIMEOUT_WINDOW_MS = 30_000 // 30 s rolling window

function getModelTimeoutCount(model: ModelName): number {
  const now = Date.now()
  return (modelTimeouts.get(model) || []).filter(
    (t) => now - t <= TIMEOUT_WINDOW_MS
  ).length
}
function shouldUseModelFallback(model: ModelName): boolean {
  return (
    getModelTimeoutCount(model) >= 10 && model !== getDefaultModels().fallback
  )
}
function getFallbackModel(model: ModelName): ModelName {
  return getDefaultModels().fallback
}

/* -------------------------------------------------------------------------- */
/*                          Model Name to LanguageModel                       */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                             exec* helpers                                  */
/* -------------------------------------------------------------------------- */

async function execText(
  req: TextRequest
): Promise<TResponse<{ text: string; reasoning?: string }>> {
  const {
    messages,
    model: wanted = getDefaultModels().default,
    retries = 2,
    opts = {},
  } = req

  const modelName = shouldUseModelFallback(wanted)
    ? getFallbackModel(wanted)
    : wanted

  const model = getLanguageModelWithReasoning(modelName, opts)

  try {
    const baseOptions: Parameters<typeof generateText>[0] = {
      model,
      messages,
      maxRetries: retries,
      maxSteps: opts.maxSteps ?? CONFIG.tools.maxStepsVercel,
    }

    const isReasoning = Boolean(opts.reasoning)
    const gen = await runWithStallGuard<GenerateTextResult<ToolSet, any>>(
      baseOptions,
      {
        modelName: modelName,
        // Text generations can reasonably take longer than 30s, especially with reasoning models.
        // Use higher defaults and scale with reasoning flag.
        overallTimeoutMs: isReasoning ? 240_000 : 120_000,
        stallTimeoutMs: isReasoning ? 120_000 : 60_000,
      }
    )

    const usd = calculateUsageCost(gen.usage, modelName)
    if (opts.saveOutputs) await saveResultOutput(gen)
    spending.addCost(usd)

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
    let message = ""
    lgg.error("execText error", err)
    if (APICallError.isInstance(err)) {
      message = err.responseBody ?? err.message ?? "Unknown error in execText"
    } else {
      message = (err as Error).message
    }
    lgg.error("execText errorr", message)
    // Track model timeouts to enable temporary fallback if a model times out frequently.
    if (
      typeof message === "string" &&
      (message.includes("Overall timeout") || message.includes("Stall timeout"))
    ) {
      const now = Date.now()
      const existing = modelTimeouts.get(modelName) ?? []
      existing.push(now)
      modelTimeouts.set(modelName, existing)
    }
    return {
      success: false,
      data: null,
      error: message,
      debug_input: messages,
      debug_output: err,
    }
  }
}

async function execTool(
  req: ToolRequest
): Promise<TResponse<GenerateTextResult<ToolSet, any>>> {
  const { messages, model: modelIn, retries = 2, opts } = req
  const requestedModel = modelIn ?? getDefaultModels().default

  try {
    const modelName = shouldUseModelFallback(requestedModel)
      ? getFallbackModel(requestedModel)
      : requestedModel

    const model = getLanguageModelWithReasoning(modelName, opts)

    const baseOptions: Parameters<typeof generateText>[0] = {
      model,
      messages,
      maxRetries: retries,
      tools: opts.tools,
      toolChoice: opts.toolChoice,
      maxSteps: opts.maxSteps ?? CONFIG.tools.maxStepsVercel,
    }
    const gen = await runWithStallGuard<GenerateTextResult<ToolSet, any>>(
      baseOptions,
      {
        modelName: modelName,
        overallTimeoutMs: 300_000,
        stallTimeoutMs: 200_000,
      }
    )

    const usd = calculateUsageCost(gen.usage, modelName)
    if (opts.saveOutputs) await saveResultOutput(gen)
    spending.addCost(usd)

    return {
      success: true,
      data: gen,
      usdCost: usd,
      error: null,
      debug_input: messages,
      debug_output: gen,
    }
  } catch (error: any) {
    // Handle tool errors gracefully without dumping large stacks
    let message = ""
    const isArgValidationError =
      typeof error?.name === "string" &&
      (error.name.includes("AI_InvalidToolArgumentsError") ||
        error.name.includes("AI_TypeValidationError"))
    const isTypeValidationText =
      typeof error?.message === "string" &&
      error.message.toLowerCase().includes("type validation failed")

    if (!isArgValidationError && !isTypeValidationText) {
      // Only log full details for unexpected errors
      lgg.error("execTool error", error, opts.toolChoice, opts.tools)
    } else {
      // Keep logs concise for validation errors
      lgg.warn(
        `execTool validation error: ${error?.message ?? "invalid tool arguments"}`
      )
    }
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
    return {
      success: false,
      data: null,
      error: message,
      debug_input: messages,
      debug_output: error,
    }
  }
}

async function execStructured<S extends ZodTypeAny>(
  req: StructuredRequest<S>
): Promise<TResponse<z.infer<S>>> {
  const { messages, model: modelIn, retries = 2, schema, opts = {} } = req

  const requestedModel = modelIn ?? getDefaultModels().default
  const model = shouldUseModelFallback(requestedModel)
    ? getFallbackModel(requestedModel)
    : requestedModel

  try {
    const { genObject } = await import("@core/messages/api/genObject")
    let genResult: Awaited<ReturnType<typeof genObject>>
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
            `Overall timeout (120 s) for ${model} – mode:structured`
          ),
        }
      )
    } catch (err) {
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
      return {
        success: false,
        data: null,
        error: error ?? "genObject error",
        debug_input: messages,
        debug_output: error,
      }
    }

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
    return {
      success: false,
      data: null,
      error: (err as Error).message || "Unknown error in execStructured",
      debug_input: messages,
      debug_output: err,
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                           The public sendAI()                              */
/* -------------------------------------------------------------------------- */

async function _sendAIInternal(
  req: TextRequest | ToolRequest | StructuredRequest<any>
): Promise<any> {
  /* ---- global guard‑rails ---- */
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
  if (
    !req.messages?.length ||
    !req.messages.some((m) =>
      typeof m.content === "string"
        ? m.content.trim()
        : Array.isArray(m.content)
          ? m.content.length
          : false
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
  req.model = req.model ?? getDefaultModels().default

  /* ---- delegate to mode‑specific helper ---- */
  switch (req.mode) {
    case "text":
      return execText(req)
    case "tool":
      return execTool(req)
    case "structured":
      return execStructured(req)
    default: {
      const _exhaustiveCheck: never = req
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
 * **Public API** –
 * Use sendAI with the following signature:
 *
 * sendAI is the main API for interacting with AI models. It supports three modes:
 *
 * 1. TextRequest - For simple text generation:
 *    - messages: Array of chat messages with role and content
 *    - model: AI model to use (defaults to getDefaultModels().default)
 *    - mode: "text"
 *    - opts: Optional settings like temperature, reasoning, etc.
 *
 * 2. ToolRequest - For function calling/tool usage:
 *    - messages: Array of chat messages
 *    - model: AI model to use
 *    - mode: "tool"
 *    - tools: Array of tool definitions the AI can call
 *    - opts: Optional settings
 *
 * 3. StructuredRequest - For structured output with schema validation:
 *    - messages: Array of chat messages
 *    - model: AI model to use
 *    - mode: "structured"
 *    - schema: Zod schema defining the expected output structure
 *    - opts: Optional settings
 *
 * All modes return a standardized response with success/error status,
 * data payload, cost information, and debug details.
 *
 */
export const sendAI: SendAI = async (
  req: TextRequest | ToolRequest | StructuredRequest<any>
) => {
  // Log which file is requesting sendAI by inspecting the stack trace
  const stack = new Error().stack
  let callerFile: string | undefined = undefined
  if (stack) {
    // Find the first stack line outside this file
    const lines = stack.split("\n")
    for (const line of lines) {
      if (line.includes(".ts") && !line.includes("sendAI.ts")) {
        // Try to extract the file path
        const match = line.match(/(?:\()?(.*?\.ts):\d+:\d+\)?/)
        if (match && match[1]) {
          callerFile = match[1]
          break
        }
      }
    }
  }
  // extract
  // EXAMPLE OUTPUT of callerFile => '    at Function.mutatePrompt (/Users/here/CODE_FOLDER/main-projects/thesis/together/app/src/core/improvement/gp/operators/Mutations.ts'

  try {
    const start = Date.now()
    // lgg.info(`Sending AI request from ${extractedFileName}`)
    // return await limiter.schedule(() => _sendAIInternal(req))
    const result = await _sendAIInternal(req)
    const end = Date.now()
    const duration = end - start
    // if (req.debug)
    // lgg.info(
    //   `sendAI duration for model ${req.model ?? "unknown"}: ${duration}ms`
    // )
    return result
  } catch (error) {
    const extractedFileName = callerFile?.split("/").pop()
    console.error(
      `sendAI error ${extractedFileName} ${JSON.stringify(error).slice(0, 100)}`
    )
    return {
      success: false,
      data: null,
      error:
        (error as Error).message ||
        `Unknown error in sendAI ${extractedFileName}`,
      debug_input: req.messages ?? [],
      debug_output: error,
    }
  }
}

// Normalize model names for database storage
export const normalizeModelName = (modelName: ModelNameV2): string => {
  // Ensure consistent string format and trim any whitespace
  return String(modelName).trim()
}
