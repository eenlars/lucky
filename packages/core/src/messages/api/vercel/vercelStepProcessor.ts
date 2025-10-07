import { calculateUsageCost } from "@core/messages/api/vercel/pricing/vercelUsage"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import type { ModelName } from "@core/utils/spending/models.types"
import { asArray, isNir } from "@lucky/shared"
import { Tools } from "@lucky/shared"
import type { StepResult, ToolCallPart, ToolSet } from "ai"

const normaliseCalls = <T extends ToolSet>(step: StepResult<T>) => asArray(step.toolCalls)

const normaliseResults = <T extends ToolSet>(step: StepResult<T>) => {
  // Handle multiple shapes:
  // 1) Vercel AI SDK ToolResult wrappers: [{ output: ... }]
  // 2) Raw results array already (e.g., the fixture provides an array of objects)
  // 3) Single result object
  const raw = step.toolResults

  if (raw == null) return []

  const arrayified = Array.isArray(raw) ? raw : [raw]

  const looksWrapped = arrayified.every(
    item => item && typeof item === "object" && ("output" in item || "result" in item),
  )

  if (looksWrapped) {
    return arrayified.map(r => (r as any).output ?? (r as any).result)
  }

  // If toolResults is already the raw payload (e.g., an array of places),
  // treat the entire payload as the single result for this step.
  return [Array.isArray(raw) ? raw : raw]
}

// Convert v5 format (content array with tool-call/tool-result/text) to v4 format
const convertV5Step = (step: any) => {
  if (!step || !step.content || !Array.isArray(step.content)) {
    return step // Return as-is if not v5 format
  }

  const toolCalls: any[] = []
  const toolResults: any[] = []
  let textContent = ""

  // Extract tool calls, results, and text from content array
  for (const item of step.content) {
    if (item.type === "tool-call") {
      toolCalls.push({
        toolName: item.toolName,
        input: item.input,
        args: item.input, // Support both formats
      })
    } else if (item.type === "tool-result") {
      toolResults.push({
        output: item.output,
        result: item.output, // Support both formats
      })
    } else if (item.type === "text" && item.text) {
      textContent += item.text
    }
  }

  // Convert to v4 format
  return {
    ...step,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    toolResults: toolResults.length > 0 ? toolResults : undefined,
    text: textContent || step.text, // Preserve existing text or use extracted text
  }
}

export const processStepsV2 = <T extends ToolSet>(
  steps: StepResult<T>[],
  modelUsed: ModelName,
): { usdCost: number; agentSteps: AgentSteps } | undefined => {
  if (isNir(steps) || !Array.isArray(steps)) return { usdCost: 0, agentSteps: [] }

  // Convert v5 format steps to v4 format
  const convertedSteps = steps.map(convertV5Step)

  /* ---------- 1. Map every step to the internal shape ---------- */
  const unwrapToolResponse = (value: unknown): unknown => (Tools.isCodeToolResult(value) ? value.output : value)
  const perStep = convertedSteps.map((rawStep: StepResult<T>) => {
    const step = rawStep ?? {}

    const calls = normaliseCalls(step) // [] if none
    const results = normaliseResults(step)
    const text = step.text ?? ""

    const toolCalls = calls.map((c: ToolCallPart, i: number) => {
      const toolResult = results[i]
      const finalResponse =
        toolResult && typeof toolResult === "object" && Object.keys(toolResult).length === 0 ? text : toolResult || text

      return {
        toolName: c?.toolName ?? "",
        toolArgs: (c as any)?.input ?? (c as any)?.args ?? {},
        toolResponse: unwrapToolResponse(finalResponse),
      }
    })

    return {
      toolCalls,
      totalCost: calculateUsageCost(step.usage, modelUsed) || 0,
      rawText: text, // keep for possible fallback
    }
  })

  /* ---------- 2. Aggregate using for loops ---------- */
  const aggregated: AgentSteps = []
  let lastText = ""
  const hasAnyNonNullStep = convertedSteps.some((s: StepResult<T>) => s != null)

  for (const { toolCalls, totalCost, rawText } of perStep) {
    // add tool outputs if present
    for (const call of toolCalls) {
      aggregated.push({
        type: "tool" as const,
        name: call.toolName,
        args: call.toolArgs,
        return: call.toolResponse,
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
    if (hasAnyNonNullStep || (typeof lastText === "string" && lastText.length > 0)) {
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
