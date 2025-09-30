import type { AgentStep, AgentSteps } from "./AgentStep.types"

export interface LegacyToolUsageStep {
  type: string
  toolName?: string
  toolArgs?: unknown
  toolResponse?: unknown
  name?: string
  args?: unknown
  return?: unknown
  summary?: string
}

export interface LegacyToolUsage {
  outputs: LegacyToolUsageStep[] | Record<string, LegacyToolUsageStep>
  totalCost?: number
}

export const isLegacyToolUsage = (value: unknown): value is LegacyToolUsage => {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  if (!("outputs" in v)) return false
  const outputs = v.outputs as unknown
  if (Array.isArray(outputs)) {
    return outputs.every(s => typeof s === "object" && s !== null)
  }
  if (typeof outputs === "object" && outputs !== null) {
    return Object.values(outputs).every(s => typeof s === "object" && s !== null)
  }
  return false
}

export function normalizeLegacyToolUsage(legacy: LegacyToolUsage): {
  steps: AgentSteps
  totalCost?: number
} {
  const arrayOutputs: LegacyToolUsageStep[] = Array.isArray(legacy.outputs)
    ? legacy.outputs
    : Object.values(legacy.outputs)

  const steps: AgentSteps = arrayOutputs.map((o, idx) => {
    if (o.type === "tool") {
      return {
        type: "tool" as const,
        name: o.toolName ?? o.name ?? `legacy-tool-${idx + 1}`,
        args: o.toolArgs ?? o.args ?? {},
        return: o.toolResponse ?? (o.return !== undefined ? o.return : ""),
        summary: o.summary,
      }
    }
    if (o.type === "text") {
      const val = o.return ?? o.toolResponse ?? ""
      return {
        type: "text",
        return: typeof val === "string" ? val : JSON.stringify(val),
      }
    }
    if (o.type === "reasoning" || o.type === "plan" || o.type === "error") {
      const val = o.return ?? o.toolResponse ?? ""
      return {
        type: o.type as any,
        return: typeof val === "string" ? val : JSON.stringify(val),
      }
    }
    const val = o.return ?? o.toolResponse ?? ""
    return {
      type: o.type as any,
      return: typeof val === "string" ? val : JSON.stringify(val),
    } as AgentStep
  })

  return { steps, totalCost: legacy.totalCost }
}
