import type { AgentStep } from "@core/messages/pipeline/AgentStep.types"
import { truncater } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import type { NodeMemory } from "@core/utils/memory/memorySchema"
import type { ModelName } from "@core/utils/spending/models.types"
import type { ModelMessage, ToolSet } from "ai"
import type { NodeInvocationCallContext } from "../input.types"

/**
 * Mutable context used by the multi-step loop while iterating over agent steps.
 */
export interface MultiStepLoopContext {
  ctx: NodeInvocationCallContext
  tools: ToolSet
  agentSteps: AgentStep[]
  model: ModelName
  maxRounds: number
  verbose: boolean
  addCost: (cost: number) => void
  setUpdatedMemory: (memory: NodeMemory) => void
  getTotalCost: () => number
}

type ToolUsageToStringOptions = {
  includeArgs?: boolean
}

export const toolUsageToString = (
  usage: AgentStep[],
  truncate = 100,
  options: ToolUsageToStringOptions = {
    includeArgs: false,
  }
): string => {
  if (!usage) {
    lgg.error("toolUsageToString: usage is null/undefined", usage)
    return ""
  }

  return usage
    .map((u) => {
      if (!u) return ""
      const data = u.return && typeof u.return === "object" && "data" in u.return ? u.return.data : u.return
      switch (u.type) {
        case "prepare":
          return `<prepare_step>${u.return}</prepare_step>`
        case "tool":
          return `<tool_call_step_${u.name}>
          ${options.includeArgs ? `<args>${truncater(JSON.stringify(u.args), 200)}</args>` : ""}
          <data>
          ${truncater(JSON.stringify(data), truncate)}
          </data>
          ${u.summary ? `<summary>${u.summary}</summary>` : ""}
          </tool_call_step_${u.name}>`
        case "text":
          return `<text_step>${u.return}</text_step>`
        case "error":
          return `<error_step>${u.return}</error_step>`
        case "reasoning":
          return `<reasoning_step>${u.return}</reasoning_step>`
        case "terminate":
          return `<terminate_step>${u.return}</terminate_step>`
        case "plan":
          return `<plan_step>${u.return}</plan_step>`
        case "learning":
          return `<learning_step>${u.return}</learning_step>`
        case "debug":
          return `` // nothing!
        default: {
          const _exhaustiveCheck: never = u
          void _exhaustiveCheck
          return ""
        }
      }
    })
    .join("\n")
}

export const prompt = (content: string): ModelMessage[] => {
  const messages: ModelMessage[] = [
    {
      role: "user",
      content,
    },
  ]
  return messages
}
export const system = (content: string): ModelMessage[] => {
  return [
    {
      role: "system",
      content,
    },
  ]
}

// moved StrategyResult to selectTool/toolstrategy.types.ts for cohesion
