import type { VercelUsage } from "@core/messages/api/vercel/pricing/calculatePricing"
import { calculateUsageCost } from "@core/messages/api/vercel/pricing/vercelUsage"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import Tools from "@core/tools/code/output.types"
import { isNir } from "@core/utils/common/isNir"
import { asArray } from "@core/utils/common/utils"
import type { ModelName } from "@core/utils/spending/models.types"
import type { StepResult, ToolCallPart, ToolResult, ToolSet } from "ai"

const normaliseCalls = <T extends ToolSet>(step: StepResult<T>) =>
  asArray(step.toolCalls)

const normaliseResults = <T extends ToolSet>(step: StepResult<T>) => {
  // Handle multiple shapes:
  // 1) Vercel AI SDK ToolResult wrappers: [{ result: ... }]
  // 2) Raw results array already (e.g., the fixture provides an array of objects)
  // 3) Single result object
  const raw = step.toolResults as unknown

  if (raw == null) return []

  const arrayified = Array.isArray(raw) ? raw : [raw]

  const looksWrapped = arrayified.every(
    (item: any) => item && typeof item === "object" && "result" in item
  )

  if (looksWrapped) {
    return (arrayified as unknown as ToolResult<string, any, any>[]).map(
      (r) => r.result
    )
  }

  // If toolResults is already the raw payload (e.g., an array of places),
  // treat the entire payload as the single result for this step.
  return [Array.isArray(raw) ? raw : raw]
}

export const processStepsV2 = <T extends ToolSet>(
  steps: StepResult<T>[],
  modelUsed: ModelName
): { usdCost: number; agentSteps: AgentSteps } | undefined => {
  if (isNir(steps) || !Array.isArray(steps))
    return { usdCost: 0, agentSteps: [] }

  /* ---------- 1. Map every step to the internal shape ---------- */
  const unwrapToolResponse = (value: unknown): unknown =>
    Tools.isCodeToolResult(value)
      ? (value as { output: unknown }).output
      : value
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
        toolResponse: unwrapToolResponse(finalResponse),
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
  const aggregated: AgentSteps = []
  let lastText = ""
  const hasAnyNonNullStep = (steps as unknown[]).some((s) => s != null)

  for (const { toolCalls, totalCost, rawText } of perStep) {
    // add tool outputs if present
    for (const call of toolCalls) {
      aggregated.push({
        type: "tool" as const,
        name: call.toolName as string,
        args: call.toolArgs as Record<string, any>,
        return: call.toolResponse as unknown,
      })
    }

    // remember the last plain-text chunk (for optional fallback)
    lastText = rawText || lastText
  }

  /* ---------- 3. Fallbacks ---------- */
  // If there are no aggregated tool calls:
  // - If we have any non-null step present, emit text (even if empty) to reflect a processed step
  // - Else (truly empty input), return no steps
  if (aggregated.length === 0) {
    if (
      hasAnyNonNullStep ||
      (typeof lastText === "string" && lastText.length > 0)
    ) {
      aggregated.push({
        type: "text" as const,
        name: undefined,
        args: undefined,
        return: lastText,
      })
    }
  }

  return {
    usdCost: perStep.reduce((acc, step) => acc + step.totalCost, 0),
    agentSteps: aggregated,
  }
}
