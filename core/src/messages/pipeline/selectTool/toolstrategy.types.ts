import type { AgentStep } from "@core/messages/pipeline/AgentStep.types"
import type { ModelName } from "@core/utils/spending/models.types"
import type { ToolSet } from "ai"

export type SelectToolStrategyOptions<T extends ToolSet> = {
  tools: T
  identityPrompt: string
  agentSteps: AgentStep[]
  roundsLeft: number
  systemMessage: string
  model: ModelName
}
