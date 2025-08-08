import type { NodeLogs } from "@core/messages/api/processResponse"
import { isNir } from "@core/utils/common/isNir"
import { asArray } from "@core/utils/common/utils"
import type { ModelName } from "@core/utils/spending/models.types"
import { type VercelUsage } from "@core/utils/spending/vercel/calculatePricing"
import { calculateUsageCost } from "@core/utils/spending/vercel/vercelUsage"
import type { StepResult, ToolCallPart, ToolResult, ToolSet } from "ai"

const normaliseCalls = <T extends ToolSet>(step: StepResult<T>) =>
  asArray(step.toolCalls)

const normaliseResults = <T extends ToolSet>(step: StepResult<T>) => {
  const results = asArray(step.toolResults)
  return results.map((result: ToolResult<string, any, any>) => {
    return result.result
  })
}

export const processStepsV2 = <T extends ToolSet>(
  steps: StepResult<T>[],
  modelUsed: ModelName
): NodeLogs | undefined => {
  if (isNir(steps) || !Array.isArray(steps))
    return {
      outputs: [],
      totalCost: 0,
    }

  /* ---------- 1. Map every step to the internal shape ---------- */
  const perStep = (steps as StepResult<T>[]).map((rawStep) => {
    const step = rawStep ?? {}

    const calls = normaliseCalls(step) // [] if none
    const results = normaliseResults(step)
    const text = step.text ?? ""

    const toolCalls = calls.map((c: ToolCallPart, i: number) => {
      const toolResult = results[i]
      const finalResponse =
        toolResult &&
        typeof toolResult === "object" &&
        Object.keys(toolResult).length === 0
          ? text
          : toolResult || text

      return {
        toolName: c?.toolName ?? "",
        toolArgs: c?.args ?? {},
        toolResponse: finalResponse,
      }
    })

    return {
      toolCalls,
      totalCost:
        calculateUsageCost(step.usage as Partial<VercelUsage>, modelUsed) || 0,
      rawText: text, // keep for possible fallback
    }
  })

  /* ---------- 2. Aggregate using for loops ---------- */
  const aggregated: NodeLogs = {
    outputs: [],
    totalCost: 0,
  }
  let lastText = ""

  for (const { toolCalls, totalCost, rawText } of perStep) {
    // add tool outputs if present
    for (const call of toolCalls) {
      aggregated.outputs.push({
        type: "tool" as const,
        name: call.toolName as string,
        args: call.toolArgs as Record<string, any>,
        return: call.toolResponse as string,
      })
    }

    // remember the last plain-text chunk (for optional fallback)
    lastText = rawText || lastText
    aggregated.totalCost += totalCost
  }

  /* ---------- 3. Fallback: no tool calls at all ⇒ emit text ---------- */
  if (aggregated.outputs.length === 0) {
    aggregated.outputs.push({
      type: "text" as const,
      name: undefined,
      args: undefined,
      return: lastText,
    })
  }

  return aggregated
}
