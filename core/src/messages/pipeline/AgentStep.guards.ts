import type { AgentStep, AgentSteps } from "./AgentStep.types"

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isAgentStep(value: unknown): value is AgentStep<any> {
  if (!isPlainObject(value)) return false
  const t = value.type
  if (typeof t !== "string") return false
  switch (t) {
    case "prepare":
    case "reasoning":
    case "plan":
    case "text":
    case "learning":
    case "debug":
    case "error":
      return "return" in value
    case "terminate":
      return "return" in value
    case "tool":
      return typeof value.name === "string"
    default:
      return false
  }
}

export function isAgentSteps(value: unknown): value is AgentSteps<any> {
  return Array.isArray(value) && value.every(v => isAgentStep(v))
}
