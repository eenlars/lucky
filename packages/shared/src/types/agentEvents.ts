/**
 * Agent execution events for real-time streaming
 */

export type BaseAgentEvent = {
  timestamp: number
  nodeId: string
}

export type AgentStartEvent = BaseAgentEvent & {
  type: "agent.start"
  nodeName: string
}

export type AgentEndEvent = BaseAgentEvent & {
  type: "agent.end"
  duration: number
  cost: number
  tokenUsage?: {
    prompt: number
    completion: number
  }
}

export type AgentErrorEvent = BaseAgentEvent & {
  type: "agent.error"
  error: string
  stack?: string
}

export type AgentToolStartEvent = BaseAgentEvent & {
  type: "agent.tool.start"
  toolName: string
  args: Record<string, unknown>
}

export type AgentToolEndEvent = BaseAgentEvent & {
  type: "agent.tool.end"
  toolName: string
  duration: number
  result?: unknown
  error?: string
}

/**
 * Discriminated union of all agent events
 */
export type AgentEvent = AgentStartEvent | AgentEndEvent | AgentErrorEvent | AgentToolStartEvent | AgentToolEndEvent
