import { CONFIG, isLoggingEnabled } from "@core/core-config/compat"
import { getDefaultModels } from "@core/core-config/compat"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import {
  type ProcessedResponse,
  type TextProcessed,
  type ToolProcessed,
  isErrorProcessed,
  isTextProcessed,
  isToolProcessed,
} from "@core/messages/api/vercel/processResponse.types"
import { buildSimpleMessage } from "@core/messages/create/buildSimpleMessage"
import { CreateSummaryPrompt } from "@core/prompts/createSummary.p"
import { llmify, truncater } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import type { ModelName } from "@core/utils/spending/models.types"
import { JSONN } from "@lucky/shared"
import { isNir } from "@lucky/shared"
import chalk from "chalk"
import z from "zod"

/**
 * Result object returned by summary helpers.
 */
export interface SummaryResult {
  summary: string
  usdCost: number
}
/**
 * Minimal, persistable invocation summary shape.
 */
export interface InvocationSummary {
  summary: string
  timestamp: number
  nodeId: string
}

const verbose = isLoggingEnabled("Summary")
const BYTES_FOR_SUMMARY = 200

const createAISummary = async (
  prompt: string,
  description: string,
  model: ModelName = getDefaultModels().summary,
  schema?: z.ZodSchema,
): Promise<{ summary: string; usdCost: number } | null> => {
  try {
    const messages = buildSimpleMessage({
      message: prompt,
      nodeDescription: description,
      debug: false,
      workflowFiles: [],
    })

    const result = schema
      ? await sendAI({ messages, model, mode: "structured", schema })
      : await sendAI({ messages, model, mode: "text" })

    if (result.success) {
      const summary = schema ? result.data.summary : result.data?.text
      if (summary) return { summary, usdCost: result.usdCost ?? 0 }
    }
  } catch (error) {
    lgg.warn(`Failed to generate AI summary: ${error}`)
  }
  return null
}

const getDataInfo = (data: unknown): { str: string; size: number; readable: boolean } => {
  if (data instanceof Blob || data instanceof ArrayBuffer) {
    const size = data instanceof Blob ? data.size : data.byteLength
    return { str: `binary (${size} bytes)`, size, readable: false }
  }

  let str: string
  if (typeof data === "string") {
    str = JSONN.isJSON(data) ? JSONN.show(data) : data
  } else if (typeof data === "object" && data !== null) {
    str = JSONN.show(data, 2)
  } else {
    str = String(data)
  }

  return { str, size: new Blob([str]).size, readable: true }
}

const createFallbackSummary = (data: unknown, size: number): SummaryResult => {
  const dataType = Array.isArray(data) ? "array" : typeof data

  if (Array.isArray(data)) {
    return {
      summary: `${dataType} (${size} bytes): ${data.length} items`,
      usdCost: 0,
    }
  }

  if (typeof data === "object" && data !== null) {
    const keys = Object.keys(data)
    const sampleKeys = keys.slice(0, 3).join(", ") + (keys.length > 3 ? "..." : "")
    return {
      summary: `object (${size} bytes): ${keys.length} keys (${sampleKeys})`,
      usdCost: 0,
    }
  }

  const str = String(data)
  return {
    summary: `${dataType} (${size} bytes): ${str.substring(0, 100)}${str.length > 100 ? "..." : ""}`,
    usdCost: 0,
  }
}

export const createSummary = async (response: ProcessedResponse): Promise<SummaryResult> => {
  if (isNir(response)) {
    if (verbose) lgg.error("[createSummary] response is nir")
    return { summary: "no response received", usdCost: 0 }
  }

  if (verbose) lgg.log(`[createSummary] processing response type: ${response?.type ?? "unknown"}`)

  if (isErrorProcessed(response)) {
    return {
      summary: `error: ${response.message?.slice(0, 100)}${
        response.details ? ` (${JSON.stringify(response.details).slice(0, 100)}...)` : ""
      }`,
      usdCost: 0,
    }
  }

  if (isToolProcessed(response)) return createToolSummary(response)
  if (isTextProcessed(response)) return createTextSummary(response)

  lgg.log(chalk.red("[createSummary] unknown response type"))
  return { summary: "unknown response type", usdCost: 0 }
}

export const createTextSummary = async (response: TextProcessed): Promise<SummaryResult> => {
  if (isNir(response.content)) return { summary: "could not get any data", usdCost: 0 }
  if (response.content.length <= 200) return { summary: response.content, usdCost: 0 }

  const aiResult = await createAISummary(
    CreateSummaryPrompt.summaryPromptText(response.content),
    "data summarizer that creates concise summaries of text content",
  )

  return (
    aiResult || {
      summary: llmify(truncater(response.content, 1000)),
      usdCost: 0,
    }
  )
}

export const createToolSummary = async (response: ToolProcessed): Promise<SummaryResult> => {
  const agentSteps = response.agentSteps ?? []
  const toolNames = [...new Set(agentSteps.map(step => step.name).filter(Boolean))]
  let usdCost = response.cost ?? 0

  if (agentSteps.length === 0) {
    return {
      summary: `Tool execution: ${toolNames.join(", ")} - no operations recorded`,
      usdCost,
    }
  }

  if (verbose) {
    // lgg.log("response", JSON.stringify(response, null, 2))
    lgg.log("rawData length", JSON.stringify(agentSteps, null, 2).length)
  }

  const aiResult = await createAISummary(
    CreateSummaryPrompt.summaryPromptTool(
      toolNames.filter((n): n is string => Boolean(n)),
      JSON.stringify(agentSteps, null, 2),
    ),
    "data analyzer that summarizes tool execution results",
    getDefaultModels().summary,
    z.object({
      summary: z.string().describe("detailed summary of tool execution results, including success/failure status"),
    }),
  )

  if (aiResult) {
    usdCost += aiResult.usdCost
    if (verbose) lgg.log("🔥 result", aiResult)
    return { summary: aiResult.summary, usdCost }
  }

  return {
    summary: `Tool execution: ${toolNames.join(", ")} - ${agentSteps.length} operations (summary generation failed)`,
    usdCost,
  }
}

export const generateSummaryFromUnknownData = async (data: unknown, outputLength?: string): Promise<SummaryResult> => {
  try {
    const { str, size, readable } = getDataInfo(data)

    if (!readable || size <= BYTES_FOR_SUMMARY) {
      return { summary: str, usdCost: 0 }
    }

    const aiResult = await createAISummary(
      CreateSummaryPrompt.summaryLongPromptText(str, outputLength),
      "data summarizer for context storage",
    )

    return aiResult || createFallbackSummary(data, size)
  } catch (error) {
    lgg.warn("Error generating summary:", error)
    return {
      summary: `data: ${String(data).substring(0, 100)}...`,
      usdCost: 0,
    }
  }
}

export const formatSummary = (summary: string, nodeId: string): InvocationSummary => ({
  summary,
  timestamp: Date.now(),
  nodeId,
})
