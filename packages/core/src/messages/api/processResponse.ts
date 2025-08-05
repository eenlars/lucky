import {
  isVercelTextResponse,
  type ProcessedResponse,
} from "@messages/api/processResponse.types"
import { sendAI } from "@messages/api/sendAI"
import { processStepsV2 } from "@messages/api/stepProcessor"
import { formatSummary, type InvocationSummary } from "@messages/summaries"
import { isNir } from "@utils/common/isNir"
import { truncater } from "@utils/common/llmify"
import {
  getLogging,
  getModels,
  getSettings,
} from "@utils/config/runtimeConfig"
import { JSONN } from "@utils/file-types/json/jsonParse"
import type { ModelName } from "@utils/models/models"
import {
  calculateUsageCost,
  type VercelUsage,
} from "@utils/spending/calculatePricing"
import { R, type RS } from "@utils/types"
import { lgg } from "@logger"
import type { GenerateTextResult, ToolSet } from "ai"
export type NodeLog<TOOL_CALL_OUTPUT_TYPE> = // output depends on which tool is called.

    | {
        type: "tool"
        name: string
        args: unknown // type is the args of the tool
        return: TOOL_CALL_OUTPUT_TYPE // type is the result of the tool
        summary?: string // summary of the tool call
      }
    | {
        type: "text"
        name?: never
        args?: never
        return: string
      }
    | {
        type: "reasoning"
        name?: never
        args?: never
        return: string // reasoning
      }
    | {
        type: "terminate"
        name?: never
        args?: never
        summary: string // summary of the tool call
        return: TOOL_CALL_OUTPUT_TYPE | string // data, or message if no data
      }
    | {
        type: "plan"
        name?: never
        args?: never
        return: string // plan
      }
    | {
        type: "error"
        name?: never
        args?: never
        return: string // error message
      }
    | {
        type: "learning"
        name?: never
        args?: never
        return: string // learning message
      }

/*
 * represents a single tool execution from the vercel ai sdk response
 * - toolName: name of the tool that was called
 * - args: parameters passed to the tool
 * - result: array of tool execution results
 * - text: text response from the model
 * - toolCost: cost in usd for this tool execution
 *
 * note: multiple tools can be executed in parallel if supported by the model
 * see: StepResult<ToolSet>[] in vercel ai sdk types.
 * example: @ai-sdk/openai -> createOpenAI() -> parallelToolCalls parameter
 */
// todo-typesafety: replace 'any' default generic with proper constraint - violates CLAUDE.md "we hate any"
export interface NodeLogs<T = any> {
  outputs: NodeLog<T>[]
  totalCost: number
}

export const NodeLogsJustResponse = <T>(toolUsage: NodeLogs<T>): T[] => {
  // todo-typesafety: unsafe 'as' type assertion - violates CLAUDE.md "we hate as"
  return toolUsage.outputs.map((output) => output.return) as T[]
}

export const generateSummary = async (content: string): Promise<RS<string>> => {
  try {
    const result = await sendAI({
      messages: [
        {
          role: "user",
          content: `
          Generate a summary of the following text, and be specific about what this includes. 
          It should inform someone who has 0 knowledge about the content: ${truncater(
            content,
            1000
          )}, maximum 150 characters.`,
        },
      ],
      model: getModels().summary,
      mode: "text",
    })
    return R.success(result.data?.text ?? "", result.usdCost ?? 0)
  } catch (error) {
    lgg.error("Error generating summary", error)
    return R.error("error generating summary", 0)
  }
}

export const processVercelResponse = async ({
  response,
  model,
  summary,
  nodeId,
}: {
  // todo-typesafety: replace 'any' generic with proper type - violates CLAUDE.md "we hate any"
  response: GenerateTextResult<ToolSet, any>
  model: ModelName
  summary?: string
  nodeId: string
}): Promise<ProcessedResponse> => {
  let processed: ProcessedResponse | null = null
  processed = processModelResponse({
    response: response,
    modelUsed: model,
    summary,
    nodeId: nodeId,
  })

  // no summary necessary for short text responses
  if (
    processed.type === "text" &&
    processed.content.length < 100 &&
    processed.content.length > 5
  ) {
    processed = {
      ...processed,
      summary: processed.content ?? "Tool executed successfully",
    }
    return processed
  } else if (processed.type === "text" && processed.content.length < 5) {
    lgg.warn(
      "Tool executed successfully, but the content is too short",
      processed
    )
    processed = {
      ...processed,
      summary: processed.content ?? "Tool executed successfully",
    }
    return processed
  }

  // if the summary is not generated, generate it
  if (isNir(processed.summary)) {
    // the experimentalMultiStepLoop already generates a summary
    const {
      success,
      data: summaryResult,
      usdCost,
    } = await generateSummary(JSON.stringify(processed.toolUsage))
    processed = {
      ...processed,
      summary: success ? summaryResult : "error generating summary",
      cost: (processed.cost ?? 0) + (success ? (usdCost ?? 0) : 0),
    }
  }
  return processed
}

/**
 * Process a model response into a standardized format.
 *
 * @param response - Raw response from the model API
 * @returns Processed response with clear type discrimination
 */
export function processModelResponse({
  response,
  modelUsed,
  nodeId,
  summary,
}: {
  // todo-typesafety: replace 'any' generic with proper type - violates CLAUDE.md "we hate any"
  response: GenerateTextResult<ToolSet, any>
  modelUsed: ModelName
  nodeId: string
  summary?: string
}): ProcessedResponse {
  // Validate input
  if (!response || typeof response !== "object") {
    lgg.error("Invalid response format", response)
    return {
      nodeId,
      message: "Invalid response format",
      details: response,
      cost: 0,
      type: "error",
      toolUsage: {
        outputs: [{ type: "error", return: "Invalid response format" }],
        totalCost: 0,
      },
    }
  }

  const cost = calculateUsageCost(
    response.usage as Partial<VercelUsage>,
    modelUsed
  )

  // process steps if they exist (now returns NodeLogs)
  const processedSteps: NodeLogs | undefined = processStepsV2(
    response.steps,
    modelUsed
  )

  // if any real tool interaction happened, return as a tool response
  if (processedSteps && processedSteps.outputs.length > 0) {
    return {
      nodeId,
      toolUsage: processedSteps,
      cost,
      summary,
      type: "tool",
    }
  }

  // if it's a text response, return it
  if (isVercelTextResponse(response)) {
    return {
      nodeId,
      content: response.text,
      cost,
      summary,
      type: "text",
      toolUsage: {
        outputs: [{ type: "text", return: response.text }],
        totalCost: 0,
      },
    }
  }

  // No known pattern matched
  return {
    nodeId,
    message: "Unrecognized response format",
    details: response,
    cost: 0,
    type: "error",
    toolUsage: {
      outputs: [{ type: "error", return: "Unrecognized response format" }],
      totalCost: 0,
    },
  }
}

/**
 * Helper to get response content regardless of type
 */
export const getResponseContent = (
  response: ProcessedResponse
): string | null => {
  if (isNir(response) || response.type === "error")
    return (
      "i experienced an error: " +
      response.message +
      " details:" +
      truncater(JSON.stringify(response), 100)
    )

  if (getLogging().Tools && response.type === "tool") {
    lgg.log("🔍 Tool response:", JSONN.show(response))
  }

  // original logic
  switch (response.type) {
    case "text":
      return response.content
    case "tool":
      return (
        getFinalOutputNodeInvocation(response.toolUsage?.outputs ?? []) ?? null
      )
    default:
      throw new Error(`Unknown response type: keys:${Object.keys(response)}`)
  }
}

// start from the end of a nodelog.
// most likely, the last node is a terminal node.
// so it has a summary and a response. based on the settings in constants,
// it returns the summary, or the full output.
// if the last node is not a terminal node, it looks for the last summary, if not found, it returns null.
export const getFinalOutputNodeInvocation = (
  response: NodeLog<any>[]
): string | null => {
  if (isNir(response)) return null

  let lastContent: string | null = null

  const filterActionableSteps = response.filter(
    (step) =>
      step.type === "tool" || step.type === "text" || step.type === "terminate"
  )

  if (isNir(filterActionableSteps)) {
    lgg.error(
      "getFinalOutputNodeInvocation: filterActionableSteps is null/undefined",
      filterActionableSteps
    )
    return null
  }

  const lastOutput = filterActionableSteps[filterActionableSteps.length - 1]

  //  terminate its summary is always about all the work that was done. (different from tool calls.)
  if (
    lastOutput.type === "terminate" &&
    lastOutput.summary &&
    getSettings().workflow.handoffContent === "summary"
  ) {
    return lastOutput.summary
  }

  // based on settings in constants, return summary or full output
  // text have no summary, so we don't return it.
  if (
    getSettings().workflow.handoffContent === "summary" &&
    lastOutput.type !== "text" &&
    lastOutput.summary
  ) {
    lastContent = lastOutput.summary
  }

  // else we look for the last response content from a tool call, or text.
  // if no summary found, return null
  for (let i = filterActionableSteps.length - 1; i >= 0; i--) {
    const output = filterActionableSteps[i]
    if (output.type === "text" || output.type === "tool") {
      return output.return
    }
  }

  lgg.warn(
    "getResponseContentNodeLogs did not find a terminal node or text",
    response
  )

  return null
}

/**
 * Helper to get total cost from response
 */
export const getResponseCost = (response: ProcessedResponse): number =>
  !response || response.type === "error" ? 0 : response.cost

export type ResponseInformation = {
  nodeInvocationFullOutput: string | null
  summary: InvocationSummary
  cost: number
}

export const getResponseInformation = (
  response: ProcessedResponse,
  { nodeId }: { nodeId: string }
): ResponseInformation => {
  if (!response || response.type === "error")
    return {
      nodeInvocationFullOutput: null,
      cost: 0,
      summary: {
        timestamp: 0,
        nodeId: "",
        summary: "",
      },
    }

  if (getLogging().Tools && response.type === "tool") {
    lgg.log("🔍 Tool response:", JSONN.show(response))
  }

  const nodeInvocationFullOutput = getResponseContent(response)
  const cost = getResponseCost(response)

  const summaryText = response.summary ?? ""

  return {
    nodeInvocationFullOutput,
    cost,
    summary: formatSummary(summaryText, nodeId),
  }
}
