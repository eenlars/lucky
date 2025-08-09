import {
  isVercelTextResponse,
  type ProcessedResponse,
} from "@core/messages/api/processResponse.types"
import { sendAI } from "@core/messages/api/sendAI"
import { processStepsV2 } from "@core/messages/api/stepProcessor"
import { formatSummary, type InvocationSummary } from "@core/messages/summaries"
import type { AgentStep } from "@core/messages/types/AgentStep.types"
import { isNir } from "@core/utils/common/isNir"
import { truncater } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import { type ModelName } from "@core/utils/spending/models.types"
import { type VercelUsage } from "@core/utils/spending/vercel/calculatePricing"
import { calculateUsageCost } from "@core/utils/spending/vercel/vercelUsage"
import { R, type RS } from "@core/utils/types"
import { CONFIG } from "@runtime/settings/constants"
import { getDefaultModels } from "@runtime/settings/models"
import type { GenerateTextResult, ToolSet } from "ai"

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
      model: getDefaultModels().summary,
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
  response: GenerateTextResult<ToolSet, unknown>
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
    } = await generateSummary(JSON.stringify(processed.agentSteps))
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
  response: GenerateTextResult<ToolSet, unknown>
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
      agentSteps: [{ type: "error", return: "Invalid response format" }],
    }
  }

  const cost = calculateUsageCost(
    response.usage as Partial<VercelUsage>,
    modelUsed
  )

  // process steps if they exist (now returns AgentSteps)
  const processedSteps = processStepsV2(response.steps, modelUsed)

  // if any real tool interaction happened, return as a tool response
  if (processedSteps && processedSteps.agentSteps.length > 0) {
    return {
      nodeId,
      agentSteps: processedSteps.agentSteps,
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
      agentSteps: [{ type: "text", return: response.text }],
    }
  }

  // No known pattern matched
  return {
    nodeId,
    message: "Unrecognized response format",
    details: response,
    cost: 0,
    type: "error",
    agentSteps: [{ type: "error", return: "Unrecognized response format" }],
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

  if (CONFIG.logging.override.Tools && response.type === "tool") {
    lgg.log("🔍 Tool response:", JSON.stringify(response))
  }

  // original logic
  switch (response.type) {
    case "text":
      return response.content
    case "tool":
      return getFinalOutputNodeInvocation(response.agentSteps ?? []) ?? null
    default: {
      const _exhaustiveCheck: never = response
      void _exhaustiveCheck
      throw new Error(`Unknown response type: keys:${Object.keys(response)}`)
    }
  }
}

// start from the end of a agentStep.
// most likely, the last node is a terminal node.
// so it has a summary and a response. based on the settings in constants,
// it returns the summary, or the full output.
// if the last node is not a terminal node, it looks for the last summary, if not found, it returns null.
export const getFinalOutputNodeInvocation = (
  response: AgentStep[]
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
    CONFIG.workflow.handoffContent === "summary"
  ) {
    return lastOutput.summary
  }

  // based on settings in constants, return summary or full output
  // text have no summary, so we don't return it.
  if (
    CONFIG.workflow.handoffContent === "summary" &&
    lastOutput.type !== "text" &&
    lastOutput.summary
  ) {
    lastContent = lastOutput.summary
  }

  // else we look for the last response content from a tool call, or text.
  // if no summary found, return null
  for (let i = filterActionableSteps.length - 1; i >= 0; i--) {
    const output = filterActionableSteps[i]
    if (output.type === "text") {
      const text = typeof output.return === "string" ? output.return : ""
      if (text.trim().length > 0) return text
      // skip empty text outputs and continue searching earlier steps
      continue
    }
    if (output.type === "tool") {
      return typeof output.return === "string"
        ? output.return
        : JSON.stringify(output.return)
    }
  }

  // If configured to prefer summaries and we captured one earlier, return it
  if (lastContent && lastContent.trim().length > 0) {
    return lastContent
  }

  // Fallbacks: try to surface helpful content even if no actionable step returned output
  // 1) Return last non-empty reasoning/plan/learning content
  for (let i = response.length - 1; i >= 0; i--) {
    const output = response[i]
    if (
      output.type === "reasoning" ||
      output.type === "plan" ||
      output.type === "learning"
    ) {
      const text =
        typeof (output as { return: unknown }).return === "string"
          ? (output as { return: string }).return
          : ""
      if (text.trim().length > 0) return text
    }
  }

  // 2) As a last resort, expose the latest error message if any
  for (let i = response.length - 1; i >= 0; i--) {
    const output = response[i]
    if (output.type === "error") {
      const text =
        typeof (output as { return: unknown }).return === "string"
          ? (output as { return: string }).return
          : ""
      if (text.trim().length > 0) return text
    }
  }

  lgg.warn(
    "getResponseContentagentSteps did not find a terminal node, text, or reasoning",
    JSON.stringify(response)
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

  if (CONFIG.logging.override.Tools && response.type === "tool") {
    lgg.log("🔍 Tool response:", JSON.stringify(response))
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
