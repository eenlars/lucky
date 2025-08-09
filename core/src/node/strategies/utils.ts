import type { AgentStep } from "@core/messages/types/AgentStep.types"
import { truncater } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import type { ModelName } from "@core/utils/spending/models.types"
import type { CoreMessage, ToolSet } from "ai"
import type { NodeInvocationCallContext } from "../InvocationPipeline"

export interface MultiStepLoopContext {
  ctx: NodeInvocationCallContext
  tools: ToolSet
  agentSteps: AgentStep[]
  model: ModelName
  maxRounds: number
  verbose: boolean
  addCost: (cost: number) => void
  setUpdatedMemory: (memory: Record<string, string>) => void
  getTotalCost: () => number
}

export const toolUsageToString = (
  usage: AgentStep[],
  truncate = 100
): string => {
  if (!usage) {
    lgg.error("toolUsageToString: usage is null/undefined", usage)
    return ""
  }

  return usage
    .map((u) => {
      if (!u) return ""
      const data =
        u.return && typeof u.return === "object" && "data" in u.return
          ? u.return.data
          : u.return
      switch (u.type) {
        case "tool":
          return `tool:"${u.name}"\n${truncater(JSON.stringify(data), truncate)}\n${u.summary ? `summary:${u.summary}` : ""}`
        case "text":
          return `text:${u.return}`
        case "error":
          return `error:${u.return}`
        case "reasoning":
          return `reasoning:${u.return}`
        case "terminate":
          return `terminate:${u.return}`
        case "plan":
          return `plan:${u.return}`
        case "learning":
          return `learning:${u.return}`
        default: {
          const _exhaustiveCheck: never = u
          void _exhaustiveCheck
          return ""
        }
      }
    })
    .join("\n")
}

export const prompt = (content: string): CoreMessage[] => {
  const messages: CoreMessage[] = [
    {
      role: "user",
      content,
    },
  ]
  return messages
}
export const system = (content: string): CoreMessage[] => {
  return [
    {
      role: "system",
      content,
    },
  ]
}

export type StrategyResult<T> =
  | {
      type: "tool"
      toolName: keyof T
      reasoning: string
      plan: string
      check?: string
      expectsMutation?: boolean
      usdCost: number
    }
  | { type: "terminate"; reasoning: string; usdCost: number }
  | { type: "error"; reasoning: string; usdCost: number }
