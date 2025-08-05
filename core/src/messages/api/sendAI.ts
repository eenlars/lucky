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

import { openai } from "@ai-sdk/openai"
import {
  openrouter,
  type OpenRouterSharedSettings,
} from "@openrouter/ai-sdk-provider"
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

import { runWithStallGuard } from "@core/messages/api/stallGuard"
import { groqProvider } from "@core/utils/clients/groq/groqClient"
import { lgg } from "@core/utils/logging/Logger"
import { saveResultOutput } from "@core/utils/persistence/saveResult"
import { calculateUsageCost } from "@core/utils/spending/calculatePricing"
import {
  getPricingLevel,
  openaiModelsByLevel,
} from "@core/utils/spending/pricing"
import { SpendingTracker } from "@core/utils/spending/SpendingTracker"
import { CONFIG, MODELS } from "@runtime/settings/constants"
import type { ModelName } from "@runtime/settings/models"

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

function trackModelTimeout(model: ModelName): void {
  const now = Date.now()
  if (!modelTimeouts.has(model)) modelTimeouts.set(model, [])
  modelTimeouts.get(model)!.push(now)
  cleanupOldTimeouts(model)
}
function getModelTimeoutCount(model: ModelName): number {
  const now = Date.now()
  return (modelTimeouts.get(model) || []).filter(
    (t) => now - t <= TIMEOUT_WINDOW_MS
  ).length
}
function shouldUseModelFallback(model: ModelName): boolean {
  return (
    getModelTimeoutCount(model) >= 10 && model !== MODELS.fallbackOpenRouter
  )
}
function getFallbackModel(model: ModelName): ModelName {
  switch (CONFIG.models.provider) {
    case "openai":
      return "openai/gpt-4.1-nano" as any
    case "groq":
      return "moonshotai/kimi-k2-instruct" as any
    case "openrouter":
      return MODELS.fallbackOpenRouter
    default:
      throw new Error(`Unknown provider: ${CONFIG.models.provider}`)
  }
}
function cleanupOldTimeouts(model?: ModelName): void {
  const now = Date.now()
  const entries = model ? [[model, modelTimeouts.get(model)]] : modelTimeouts
  for (const [m, arr] of entries as any) {
    if (!arr) continue
    const fresh = arr.filter((t: number) => now - t <= TIMEOUT_WINDOW_MS)
    if (fresh.length) {
      modelTimeouts.set(m, fresh)
    } else {
      modelTimeouts.delete(m)
    }
  }
}

/* ----------------------------- Model helpers ------------------------------ */

export function normalizeModelName(model: ModelName): ModelName {
  if (CONFIG.models.provider === "openai") {
    const level = getPricingLevel(model)
    return level ? openaiModelsByLevel[level] : openaiModelsByLevel.low
  }
  if (CONFIG.models.provider === "groq") {
    return "moonshotai/kimi-k2-instruct" as any
  }
  return model
}

function toOpenaiModelName(model: ModelName): string {
  if (CONFIG.models.provider !== "openai") {
    throw new Error(`Only for openai models!: ${model}`)
  }
  return model.split("/").slice(1).join("/")
}

function providerOpts(
  model: ModelName,
  wantReasoning?: boolean
): OpenRouterSharedSettings | undefined {
  const base: OpenRouterSharedSettings = { usage: { include: true } }
  if (!wantReasoning) return base

  if (model.includes("openai")) {
    return { ...base, reasoning: { effort: "high" } }
  }
  if (model.includes("anthropic") && CONFIG.models.provider === "openrouter") {
    return { ...base, reasoning: { max_tokens: 2_000 } }
  }
  return base
}

function getProvider(model: ModelName, reasoning?: boolean): LanguageModelV1 {
  if (model.includes("openai") && CONFIG.models.provider === "openai") {
    return openai(toOpenaiModelName(model), providerOpts(model, reasoning))
  }
  if (CONFIG.models.provider === "groq") {
    return groqProvider("kimi-k2-instruct") as any
  }
  return openrouter(model, providerOpts(model, reasoning))
}

/* -------------------------------------------------------------------------- */
/*                             exec* helpers                                  */
/* -------------------------------------------------------------------------- */

async function execText(
  req: TextRequest
): Promise<TResponse<{ text: string; reasoning?: string }>> {
  const {
    messages,
    model: wanted = MODELS.default,
    retries = 2,
    opts = {},
  } = req

  const model = shouldUseModelFallback(wanted)
    ? getFallbackModel(wanted)
    : wanted

  try {
    const provider = getProvider(model, opts.reasoning)

    const baseOptions: Parameters<typeof generateText>[0] = {
      model: provider,
      messages,
      maxRetries: retries,
      maxSteps: opts.maxSteps ?? CONFIG.tools.maxStepsVercel,
    }

    const gen = await runWithStallGuard<GenerateTextResult<ToolSet, any>>(
      baseOptions,
      {
        modelName: model,
        overallTimeoutMs: 30_000,
        stallTimeoutMs: 100_000,
      }
    )

    const usd = calculateUsageCost(gen.usage, model)
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
  const requestedModel = modelIn ?? MODELS.default

  try {
    const model = shouldUseModelFallback(requestedModel)
      ? getFallbackModel(requestedModel)
      : requestedModel

    const provider = getProvider(model, opts.reasoning)

    const baseOptions: Parameters<typeof generateText>[0] = {
      model: provider,
      messages,
      maxRetries: retries,
      tools: opts.tools,
      toolChoice: opts.toolChoice,
      maxSteps: opts.maxSteps ?? CONFIG.tools.maxStepsVercel,
    }
    const gen = await runWithStallGuard<GenerateTextResult<ToolSet, any>>(
      baseOptions,
      {
        modelName: model,
        overallTimeoutMs: 300_000,
        stallTimeoutMs: 200_000,
      }
    )

    const usd = calculateUsageCost(gen.usage, model)
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
    console.error(error)
    let message = ""
    lgg.error("execTool error", error, opts.toolChoice, opts.tools)
    if (APICallError.isInstance(error)) {
      if (error.responseBody) {
        message = JSON.parse(
          ((JSON.parse(error.responseBody) as any)?.error as any).metadata.raw
        )
        if (!message) message = error.message
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

  const requestedModel = modelIn ?? MODELS.default
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
  req.model = normalizeModelName(req.model ?? MODELS.default)

  /* ---- delegate to mode‑specific helper ---- */
  switch (req.mode) {
    case "text":
      return execText(req)
    case "tool":
      return execTool(req)
    case "structured":
      return execStructured(req)
    default:
      return {
        success: false,
        data: null,
        error: `Unknown mode ${(req as any).mode}`,
        debug_input: req as any,
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
 *    - model: AI model to use (defaults to MODELS.default)
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
    // lgg.info(`Sending AI request from ${extractedFileName}`)
    // return await limiter.schedule(() => _sendAIInternal(req))
    return await _sendAIInternal(req)
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
