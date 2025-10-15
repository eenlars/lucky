import type { AgentStep } from "@core/messages/pipeline/AgentStep.types"
import type { ToolSet } from "ai"

/**
 * Options passed to a tool selection strategy implementation.
 */
export interface SelectToolStrategyOptions<T extends ToolSet> {
  tools: T
  identityPrompt: string
  agentSteps: AgentStep[]
  roundsLeft: number
  systemMessage: string
  model: string
}

/**
 * Result of a tool selection strategy decision.
 */
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
