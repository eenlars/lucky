import type { ExecutionSession, LogEntry } from "./types"

export function generateMockLogs(): LogEntry[] {
  const now = new Date()
  const baseTime = now.getTime() - 6000 // 6 seconds ago

  return [
    {
      id: "log-1",
      timestamp: new Date(baseTime),
      nodeId: "start",
      nodeName: "Start",
      nodeColor: "#3b82f6",
      type: "INFO",
      message: "Workflow execution started",
    },
    {
      id: "log-2",
      timestamp: new Date(baseTime + 456),
      nodeId: "node-tokyo",
      nodeName: "Tokyo",
      nodeColor: "#8b5cf6",
      type: "INFO",
      message: "Processing initial query",
      input: "Analyze Q4 sales data for EMEA region",
      model: "gpt-4-turbo",
      duration: 2300,
      tokens: { prompt: 234, completion: 1000, total: 1234 },
      cost: 0.02,
    },
    {
      id: "log-3",
      timestamp: new Date(baseTime + 2789),
      nodeId: "node-tokyo",
      nodeName: "Tokyo",
      nodeColor: "#8b5cf6",
      type: "SUCCESS",
      message: "Generated analysis report",
      output:
        "## Q4 EMEA Sales Analysis\n\nTotal revenue: $2.4M (+15% YoY)\nTop market: Germany (32%)\nGrowth leader: Spain (+28%)\n\nKey insights:\n- Strong holiday season performance\n- B2B segment exceeding targets\n- Digital channels driving growth",
    },
    {
      id: "log-4",
      timestamp: new Date(baseTime + 2800),
      nodeId: "node-paris",
      nodeName: "Paris",
      nodeColor: "#ec4899",
      type: "INFO",
      message: "Reviewing analysis for accuracy",
      model: "claude-3-sonnet",
      duration: 1800,
      tokens: { prompt: 456, completion: 434, total: 890 },
      cost: 0.01,
    },
    {
      id: "log-5",
      timestamp: new Date(baseTime + 4612),
      nodeId: "node-paris",
      nodeName: "Paris",
      nodeColor: "#ec4899",
      type: "SUCCESS",
      message: "Review complete",
    },
    {
      id: "log-6",
      timestamp: new Date(baseTime + 4623),
      nodeId: "node-paris",
      nodeName: "Paris",
      nodeColor: "#ec4899",
      type: "WARNING",
      message: "Output length exceeds recommended limit (4,500 words)",
    },
    {
      id: "log-7",
      timestamp: new Date(baseTime + 4650),
      nodeId: "node-london",
      nodeName: "London",
      nodeColor: "#f59e0b",
      type: "INFO",
      message: "Formatting final report",
      model: "gpt-4-turbo",
      duration: 1200,
      tokens: { prompt: 234, completion: 222, total: 456 },
      cost: 0.01,
    },
    {
      id: "log-8",
      timestamp: new Date(baseTime + 5891),
      nodeId: "node-london",
      nodeName: "London",
      nodeColor: "#f59e0b",
      type: "SUCCESS",
      message: "Formatting complete",
    },
    {
      id: "log-9",
      timestamp: new Date(baseTime + 5900),
      nodeId: "end",
      nodeName: "End",
      nodeColor: "#3b82f6",
      type: "SUCCESS",
      message: "Workflow completed in 5.9s | Total cost: $0.04",
    },
  ]
}

export function generateMockSession(): ExecutionSession {
  const logs = generateMockLogs()
  const startTime = logs[0].timestamp
  const endTime = logs[logs.length - 1].timestamp

  return {
    id: "session-1",
    startTime,
    endTime,
    status: "success",
    nodeCount: 3,
    totalCost: 0.04,
    logs,
  }
}
