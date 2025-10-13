import { useEffect, useState } from "react"
import { clearAllSessions, loadSessions, saveSession } from "./sessionManager"
import type { ExecutionSession, LogEntry } from "./types"

export interface SessionManagerState {
  sessions: ExecutionSession[]
  currentSessionId: string | null
  handleSessionSelect: (sessionId: string) => void
  handleClearHistory: () => void
}

/**
 * React hook for managing execution session persistence.
 * Handles:
 * - Loading sessions from localStorage on mount
 * - Auto-saving current session when logs change
 * - Switching between historical sessions
 * - Clearing session history
 */
export function useSessionManager(
  workflowId: string,
  currentInvocationId: string | null | undefined,
  logs: LogEntry[],
  isExecuting: boolean,
  onLogsChange: (logs: LogEntry[]) => void,
): SessionManagerState {
  const [sessions, setSessions] = useState<ExecutionSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Load sessions on mount
  useEffect(() => {
    const loadedSessions = loadSessions(workflowId)
    setSessions(loadedSessions)
  }, [workflowId])

  // Save current session when logs change
  useEffect(() => {
    if (currentInvocationId && logs.length > 0) {
      const session: ExecutionSession = {
        id: currentInvocationId,
        startTime: logs[0].timestamp,
        endTime: isExecuting ? undefined : new Date(),
        status: isExecuting ? "running" : "success",
        nodeCount: logs.filter(l => l.type === "SUCCESS" && l.nodeId !== "end").length,
        totalCost: logs.reduce((sum, log) => sum + (log.cost || 0), 0),
        logs,
      }

      saveSession(workflowId, session)
      setCurrentSessionId(currentInvocationId)
      setSessions(loadSessions(workflowId))
    }
  }, [currentInvocationId, logs, isExecuting, workflowId])

  const handleSessionSelect = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      onLogsChange(session.logs)
      setCurrentSessionId(sessionId)
    }
  }

  const handleClearHistory = () => {
    clearAllSessions(workflowId)
    setSessions([])
    setCurrentSessionId(null)
  }

  return {
    sessions,
    currentSessionId,
    handleSessionSelect,
    handleClearHistory,
  }
}
