import type { Json } from "../../../../shared/dist"

export type LearningStep = {
  type: "learning"
  name?: never
  args?: never
  return: string // learning message
}
/**
 * This is the language of the agent!
 */
export type AgentStep<TOOL_CALL_OUTPUT_TYPE = unknown> = // output depends on which tool is called.

    | {
        type: "prepare"
        name?: never
        args?: never
        return: string // prepare message
      }
    | {
        type: "tool"
        name: string
        args: unknown // type is the args of the tool
        return: TOOL_CALL_OUTPUT_TYPE // type is the result of the tool
        summary?: string // summary of the tool call
      }
    | {
        type: "text"
        name?: never
        args?: never
        return: string
      }
    | {
        type: "reasoning"
        name?: never
        args?: never
        return: string // reasoning
      }
    | {
        type: "plan"
        name?: never
        args?: never
        return: string // plan
      }
    | {
        type: "error"
        name?: never
        args?: never
        return: string // error message
      }
    | LearningStep
    | {
        type: "terminate"
        name?: never
        args?: never
        summary: string // summary of the tool call
        return: TOOL_CALL_OUTPUT_TYPE | string // data, or message if no data
      }
    | {
        type: "debug"
        name?: never
        args?: never
        return: Json // debug information
      }

export type AgentSteps<TOOL_CALL_OUTPUT_TYPE = unknown> =
  AgentStep<TOOL_CALL_OUTPUT_TYPE>[]

/**
 * @deprecated Use AgentSteps instead
 */
export type AgentStepsLegacy = {
  outputs: AgentStep[]
  totalCost: number
}
