import type { WorkflowProgressEvent } from "@lucky/shared"
import { useMemo } from "react"
import {
  type FilterConfig,
  convertEventsToLogs,
  filterLogs,
  findActiveNodeId,
  getAvailableNodes,
  searchLogs,
} from "../lib/log-engine"
import type { LogEntry } from "../types"

export interface LogEngineConfig {
  filters: FilterConfig
  searchQuery: string
}

export interface LogEngineState {
  logs: LogEntry[]
  filteredLogs: LogEntry[]
  searchMatches: number[]
  availableNodes: string[]
  activeNodeId: string | undefined
  isEmpty: boolean
}

/**
 * React hook that coordinates log computation with memoization.
 * All computation is done via pure functions from log-engine.ts
 */
export function useLogEngine(events: WorkflowProgressEvent[], config: LogEngineConfig): LogEngineState {
  // Convert events to logs (pure function + memo)
  const logs = useMemo(() => convertEventsToLogs(events), [events])

  // Apply filters (pure function + memo)
  const filteredLogs = useMemo(() => filterLogs(logs, config.filters), [logs, config.filters])

  // Apply search (pure function + memo)
  const searchResult = useMemo(() => searchLogs(filteredLogs, config.searchQuery), [filteredLogs, config.searchQuery])

  // Get available nodes for filter dropdown (pure function + memo)
  const availableNodes = useMemo(() => getAvailableNodes(logs), [logs])

  // Find currently active node (pure function + memo)
  const activeNodeId = useMemo(() => findActiveNodeId(events), [events])

  return {
    logs,
    filteredLogs: searchResult.filteredLogs,
    searchMatches: searchResult.matches,
    availableNodes,
    activeNodeId,
    isEmpty: logs.length === 0,
  }
}
