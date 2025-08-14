import type { VercelUsage } from "@core/messages/api/vercel/pricing/calculatePricing"
import { calculateUsageCost } from "@core/messages/api/vercel/pricing/vercelUsage"
import {
  isVercelTextResponse,
  type ProcessedResponse,
} from "@core/messages/api/vercel/processResponse.types"
import { processStepsV2 } from "@core/messages/api/vercel/vercelStepProcessor"
import type { AgentStep } from "@core/messages/pipeline/AgentStep.types"
import { formatSummary, type InvocationSummary } from "@core/messages/summaries"
import { isNir } from "@core/utils/common/isNir"
import { truncater } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import { type ModelName } from "@core/utils/spending/models.types"
import { CONFIG } from "@runtime/settings/constants"
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
export function processResponseVercel({
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

  // process steps if they exist (now returns AgentSteps) and derive cost deterministically
  const processedSteps = processStepsV2(response.steps, modelUsed)
  // Prefer top-level usage cost when available; fall back to per-step aggregation
  const topLevelCost = calculateUsageCost(
    (response.usage ?? {}) as Partial<VercelUsage>,
    modelUsed
  )
  const perStepCost = processedSteps?.usdCost ?? 0
  const cost = Math.max(topLevelCost, perStepCost)

  // If steps exist, decide whether it's a tool or pure text response
  if (processedSteps && processedSteps.agentSteps.length > 0) {
    const hasAnyToolStep = processedSteps.agentSteps.some(
      (s) => s.type === "tool"
    )

    if (hasAnyToolStep) {
      // At least one tool call occurred → treat as tool response
      return {
        nodeId,
        agentSteps: processedSteps.agentSteps,
        cost,
        summary,
        type: "tool",
      }
    }

    // No tool calls at all → treat as text response, keep agentSteps for downstream consumers
    const aggregatedText = processedSteps.agentSteps.find(
      (s) => s.type === "text"
    )
    const content = isVercelTextResponse(response)
      ? response.text
      : typeof aggregatedText?.return === "string"
        ? aggregatedText.return
        : ""

    return {
      nodeId,
      content,
      cost,
      summary,
      type: "text",
      agentSteps: processedSteps.agentSteps,
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

  lgg.error(
    "Unrecognized response format",
    truncater(JSON.stringify(response), 1000)
  )

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

/**
 * Consolidated details extracted from a processed response.
 */
export interface ResponseInformation {
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
