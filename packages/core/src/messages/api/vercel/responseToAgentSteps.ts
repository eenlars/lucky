import { processResponseVercel } from "@core/messages/api/processResponse"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import { truncater } from "@core/utils/common/llmify"
import type { GenerateTextResult, ToolSet } from "ai"
import { isErrorProcessed, isTextProcessed, isToolProcessed } from "../vercel/processResponse.types"

/**
 * Convert a raw Vercel AI SDK generateText response into AgentSteps.
 * Leverages the shared processModelResponse to ensure consistent behavior
 * across providers and response shapes.
 */
export function responseToAgentSteps({
  response,
  modelUsed,
  nodeId,
  summary,
  originatedFrom,
}: {
  response: GenerateTextResult<ToolSet, unknown>
  modelUsed: string
  nodeId: string
  summary?: string
  originatedFrom?: string // to find the origin of the caller, in case an error happens.
}): { agentSteps: AgentSteps; usdCost: number } {
  const processed = processResponseVercel({
    response,
    modelUsed,
    nodeId,
    summary,
    originatedFrom,
  })

  const agentSteps: AgentSteps = []

  // we need this, it helps parse the json output of the tool.
  if (isToolProcessed(processed)) {
    agentSteps.push(...processed.agentSteps)
  } else if (isTextProcessed(processed)) {
    agentSteps.push({
      type: "text",
      return: processed.content,
    })
  } else if (isErrorProcessed(processed)) {
    const details = processed.details ? ` details:${truncater(JSON.stringify(processed.details), 200)}` : ""
    agentSteps.push({
      type: "error",
      return: processed.message + details,
      cause: originatedFrom,
    })
  } else {
    agentSteps.push({
      type: "text",
      return: `unknown type of output: ${JSON.stringify(processed)}`,
    })
  }

  return {
    agentSteps: processed.agentSteps ?? [],
    usdCost: processed.cost ?? 0,
  }
}
