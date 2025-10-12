export const getTimeDifference = (timestamp: string) => {
  const startTime = new Date(timestamp).getTime()
  const currentTime = new Date().getTime()
  const diffMs = currentTime - startTime

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h ago`
  if (hours > 0) return `${hours}h ${minutes % 60}m ago`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s ago`
  return `${seconds}s ago`
}

export const formatCost = (cost: number) => {
  if (cost >= 1) return `$${cost.toFixed(2)}`
  if (cost >= 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(6)}`
}

export const formatDuration = (startTime: string, endTime: string | null) => {
  if (!endTime) return "Running..."
  const duration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
  if (duration < 60) return `${duration.toFixed(1)}s`
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes}m ${seconds.toFixed(0)}s`
}

export const extractGoalFromInput = (workflowInput: unknown): string => {
  if (!workflowInput || typeof workflowInput !== "object") {
    return "No goal specified"
  }

  const input = workflowInput as Record<string, unknown>

  // Try common field names for the goal/prompt
  if (typeof input.goal === "string" && input.goal) {
    return input.goal
  }
  if (typeof input.prompt === "string" && input.prompt) {
    return input.prompt
  }
  if (typeof input.query === "string" && input.query) {
    return input.query
  }
  if (typeof input.input === "string" && input.input) {
    return input.input
  }

  // If no recognized field, return a preview of the JSON
  try {
    const str = JSON.stringify(input)
    return str.length > 100 ? `${str.substring(0, 100)}...` : str
  } catch {
    return "Invalid input data"
  }
}
