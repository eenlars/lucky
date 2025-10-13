export type LogType = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "DEBUG"

export type LogEntry = {
  id: string
  timestamp: Date
  nodeId: string
  nodeName: string
  nodeColor?: string
  type: LogType
  message: string
  input?: string
  output?: string
  model?: string
  duration?: number // milliseconds
  tokens?: {
    prompt?: number
    completion?: number
    total?: number
  }
  cost?: number // USD
  stackTrace?: string
}

export type ExecutionSession = {
  id: string
  startTime: Date
  endTime?: Date
  status: "running" | "success" | "failed"
  nodeCount: number
  totalCost?: number
  logs: LogEntry[]
}
