import type { ExecutionSession } from "../types"

const STORAGE_KEY_PREFIX = "workflow-execution-logs-"
const MAX_SESSIONS = 10
const MAX_AGE_DAYS = 7

export function getStorageKey(workflowId: string): string {
  return `${STORAGE_KEY_PREFIX}${workflowId}`
}

export function loadSessions(workflowId: string): ExecutionSession[] {
  if (typeof window === "undefined") return []

  try {
    const key = getStorageKey(workflowId)
    const stored = localStorage.getItem(key)
    if (!stored) return []

    const data = JSON.parse(stored)
    const sessions = data.sessions || []

    // Parse dates
    return sessions.map((s: any) => ({
      ...s,
      startTime: new Date(s.startTime),
      endTime: s.endTime ? new Date(s.endTime) : undefined,
      logs: s.logs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      })),
    }))
  } catch (error) {
    console.error("Failed to load sessions:", error)
    return []
  }
}

export function saveSession(workflowId: string, session: ExecutionSession): void {
  if (typeof window === "undefined") return

  try {
    const sessions = loadSessions(workflowId)

    // Add or update session
    const existingIndex = sessions.findIndex(s => s.id === session.id)
    if (existingIndex >= 0) {
      sessions[existingIndex] = session
    } else {
      sessions.unshift(session) // Add to beginning
    }

    // Prune old sessions
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - MAX_AGE_DAYS)

    const prunedSessions = sessions.filter(s => s.startTime > cutoffDate).slice(0, MAX_SESSIONS)

    const key = getStorageKey(workflowId)
    localStorage.setItem(key, JSON.stringify({ sessions: prunedSessions }))
  } catch (error) {
    console.error("Failed to save session:", error)
  }
}

export function clearAllSessions(workflowId: string): void {
  if (typeof window === "undefined") return

  try {
    const key = getStorageKey(workflowId)
    localStorage.removeItem(key)
  } catch (error) {
    console.error("Failed to clear sessions:", error)
  }
}

export function formatSessionLabel(session: ExecutionSession): string {
  const time = session.startTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
  const today = new Date()
  const isToday = session.startTime.toDateString() === today.toDateString()
  const date = isToday ? "Today" : session.startTime.toLocaleDateString([], { month: "short", day: "numeric" })

  if (session.status === "running") {
    return `Running... (${session.nodeCount} nodes, ${date} ${time})`
  }

  const duration = session.endTime ? ((session.endTime.getTime() - session.startTime.getTime()) / 1000).toFixed(1) : "?"

  if (session.status === "success") {
    const cost = session.totalCost ? `$${session.totalCost.toFixed(2)}` : ""
    return `${date} ${time} (${session.nodeCount} nodes, ${duration}s${cost ? `, ${cost}` : ""})`
  }

  if (session.status === "failed") {
    return `Failed - ${date} ${time} (${session.nodeCount} nodes)`
  }

  return `${date} ${time}`
}
