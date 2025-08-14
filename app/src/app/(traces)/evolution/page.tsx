"use client"

import { cleanupStaleEvolutionRuns } from "@/trace-visualization/db/Evolution/retrieveEvolution"
import type { Database } from "@lucky/shared"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

dayjs.extend(relativeTime)

const _getTimeDifference = (timestamp: string) => {
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

const getDuration = (startTime: string, endTime: string | null) => {
  if (!endTime) return "Running..."

  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const diffMs = end - start

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

const isStaleRun = (run: Tables<"EvolutionRun">) => {
  if (run.status !== "running") return false

  const startTime = new Date(run.start_time).getTime()
  const currentTime = new Date().getTime()
  const elapsedHours = (currentTime - startTime) / (1000 * 60 * 60)

  // Consider stale if running for more than 5 hours (1 hour past the 24h limit)
  return elapsedHours > 5
}

interface EvolutionRunWithStats extends Tables<"EvolutionRun"> {
  total_invocations?: number
  successful_invocations?: number
  generation_count?: number
  config: {
    mode?: string
    [key: string]: any
  }
}

export default function EvolutionPage() {
  const [evolutionRuns, setEvolutionRuns] = useState<EvolutionRunWithStats[]>(
    []
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [_, setTimeUpdate] = useState(0)
  const [isNavigating, setIsNavigating] = useState(false)
  const [limit] = useState(15)
  const [loadedRuns, setLoadedRuns] = useState<EvolutionRunWithStats[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [hideEmptyRuns, setHideEmptyRuns] = useState(true)
  const [sortField, setSortField] = useState<
    keyof EvolutionRunWithStats | null
  >(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [modeFilter, setModeFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(10)

  const fetchEvolutionRuns = useCallback(
    async (showLoading = true, reset = false) => {
      if (showLoading) setLoading(true)
      setError(null)

      try {
        // Clean up stale runs first
        await cleanupStaleEvolutionRuns()

        const currentLoadedRuns = reset ? [] : loadedRuns
        const offset = currentLoadedRuns.length

        // Use the API route to get runs with stats
        const response = await fetch(
          `/api/evolution-runs?limit=${limit}&offset=${offset}`
        )
        if (!response.ok) {
          throw new Error(
            `Failed to fetch evolution runs: ${response.statusText}`
          )
        }

        const data: EvolutionRunWithStats[] = await response.json()

        if (reset) {
          setLoadedRuns(data)
          setEvolutionRuns(data)
        } else {
          const newRuns = [...currentLoadedRuns, ...data]
          setLoadedRuns(newRuns)
          setEvolutionRuns(newRuns)
        }

        setHasMore(data.length === limit)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch evolution runs"
        )
        console.error("Error fetching evolution runs:", err)
      } finally {
        if (showLoading) setLoading(false)
      }
    },
    [limit]
  )

  useEffect(() => {
    fetchEvolutionRuns(true, true)
  }, [fetchEvolutionRuns])

  const getSortValue = (
    run: EvolutionRunWithStats,
    field: keyof EvolutionRunWithStats
  ) => {
    if (field === "config") return run.config?.mode || ""
    return run[field]
  }

  const filteredAndSortedRuns = evolutionRuns
    .filter((run) => {
      // Empty runs filter
      if (
        hideEmptyRuns &&
        (!run.total_invocations || run.total_invocations === 0)
      )
        return false

      // Search filter
      if (
        searchTerm &&
        !run.goal_text.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !run.run_id.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false

      // Status filter
      if (statusFilter !== "all" && run.status !== statusFilter) return false

      // Mode filter
      if (modeFilter !== "all" && run.config?.mode !== modeFilter) return false

      // Date filter
      if (dateFilter !== "all") {
        const runDate = new Date(run.start_time)
        const now = new Date()
        const daysDiff =
          (now.getTime() - runDate.getTime()) / (1000 * 60 * 60 * 24)

        switch (dateFilter) {
          case "today":
            if (daysDiff > 1) return false
            break
          case "week":
            if (daysDiff > 7) return false
            break
          case "month":
            if (daysDiff > 30) return false
            break
        }
      }

      return true
    })
    .sort((a, b) => {
      if (!sortField) {
        // Default sort by start_time desc
        const aTime = new Date(a.start_time).getTime()
        const bTime = new Date(b.start_time).getTime()
        return bTime - aTime
      }

      const aValue = getSortValue(a, sortField)
      const bValue = getSortValue(b, sortField)

      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortDirection === "asc" ? -1 : 1
      if (bValue == null) return sortDirection === "asc" ? 1 : -1

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })

  const handleSort = (field: keyof EvolutionRunWithStats) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const getSortIcon = (field: keyof EvolutionRunWithStats) => {
    if (sortField !== field) return "⇅"
    return sortDirection === "asc" ? "↑" : "↓"
  }

  // Auto-refresh running workflows without showing loading state
  useEffect(() => {
    if (!autoRefresh) return

    const hasRunningWorkflows = evolutionRuns.some(
      (run) => run.status === "running"
    )
    if (!hasRunningWorkflows) return

    const interval = setInterval(() => {
      fetchEvolutionRuns(false, true) // Silent refresh, reset to first page
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [
    evolutionRuns.some((run) => run.status === "running"),
    fetchEvolutionRuns,
    autoRefresh,
    refreshInterval,
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUpdate((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Evolution Runs
      </h1>

      {/* Controls */}
      <div className="mb-6 space-y-4">
        {/* Row 1: Search and primary actions */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] max-w-md">
            <input
              type="text"
              placeholder="Search by goal text or run ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => fetchEvolutionRuns(true, true)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? "Loading..." : "🔄 Refresh"}
          </button>

          <button
            onClick={() => {
              setSearchTerm("")
              setStatusFilter("all")
              setModeFilter("all")
              setDateFilter("all")
              setHideEmptyRuns(false)
              setSortField(null)
            }}
            className="px-3 py-2 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            🗑️ Clear
          </button>
        </div>

        {/* Row 2: Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="interrupted">Interrupted</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Modes</option>
            <option value="cultural">Cultural</option>
            <option value="GP">Genetic Programming</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={hideEmptyRuns}
              onChange={(e) => setHideEmptyRuns(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            />
            Hide empty runs
          </label>
        </div>

        {/* Row 3: Auto-refresh and stats */}
        <div className="flex items-center gap-4 flex-wrap justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
              Auto-refresh
            </label>

            {autoRefresh && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Every
                </label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                  <option value={30}>30s</option>
                  <option value={60}>1m</option>
                </select>
              </div>
            )}

            {hasMore && (
              <button
                onClick={() => fetchEvolutionRuns(true, false)}
                disabled={loading}
                className="px-3 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                📥 Load More
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredAndSortedRuns.length} of {evolutionRuns.length}{" "}
              runs
            </span>

            {evolutionRuns.some((run) => run.status === "running") && (
              <span className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                {evolutionRuns.filter((run) => run.status === "running").length}{" "}
                running
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            {error}
          </div>
        )}
      </div>

      {filteredAndSortedRuns.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort("run_id")}
                >
                  Run ID {getSortIcon("run_id")}
                </th>
                <th
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort("goal_text")}
                >
                  Goal {getSortIcon("goal_text")}
                </th>
                <th
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort("config")}
                >
                  Type {getSortIcon("config")}
                </th>
                <th
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort("generation_count")}
                >
                  Generations {getSortIcon("generation_count")}
                </th>
                <th
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort("total_invocations")}
                >
                  Invocations {getSortIcon("total_invocations")}
                </th>
                <th
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort("status")}
                >
                  Status {getSortIcon("status")}
                </th>
                <th
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort("start_time")}
                >
                  Started {getSortIcon("start_time")}
                </th>
                <th
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort("end_time")}
                >
                  Ended {getSortIcon("end_time")}
                </th>
                <th className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRuns.map((run, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                    <Link
                      href={`/evolution/${run.run_id}`}
                      className="block w-full h-full text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 relative"
                      onClick={() => setIsNavigating(true)}
                    >
                      {run.run_id}
                      {isNavigating && (
                        <span className="absolute inset-0 bg-blue-100 dark:bg-blue-900 opacity-50 flex items-center justify-center text-xs">
                          Loading...
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                    <Link
                      href={`/evolution/${run.run_id}`}
                      className="block w-full h-full"
                    >
                      <div
                        className="max-w-xs truncate text-gray-900 dark:text-gray-100"
                        title={run.goal_text}
                      >
                        {run.goal_text}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                    <Link
                      href={`/evolution/${run.run_id}`}
                      className="block w-full h-full text-gray-900 dark:text-gray-100"
                    >
                      {run.config?.mode || "unknown"}
                    </Link>
                  </td>
                  <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                    <Link
                      href={`/evolution/${run.run_id}`}
                      className="block w-full h-full text-gray-900 dark:text-gray-100"
                    >
                      {run.generation_count || 0}
                    </Link>
                  </td>
                  <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                    <Link
                      href={`/evolution/${run.run_id}`}
                      className="block w-full h-full text-gray-900 dark:text-gray-100"
                    >
                      {run.total_invocations || 0}
                    </Link>
                  </td>
                  <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                    <Link
                      href={`/evolution/${run.run_id}`}
                      className="block w-full h-full"
                    >
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          run.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : run.status === "running"
                              ? isStaleRun(run)
                                ? "bg-orange-100 text-orange-800"
                                : "bg-blue-100 text-blue-800"
                              : run.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : run.status === "interrupted"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {run.status === "running" && isStaleRun(run)
                          ? "stale"
                          : run.status}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                    <Link
                      href={`/evolution/${run.run_id}`}
                      className="block w-full h-full text-gray-900 dark:text-gray-100"
                    >
                      {new Date(run.start_time).toLocaleString()}
                    </Link>
                  </td>
                  <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                    <Link
                      href={`/evolution/${run.run_id}`}
                      className="block w-full h-full text-gray-900 dark:text-gray-100"
                    >
                      {run.end_time
                        ? new Date(run.end_time).toLocaleString()
                        : "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                    <Link
                      href={`/evolution/${run.run_id}`}
                      className="block w-full h-full text-gray-900 dark:text-gray-100"
                    >
                      {getDuration(run.start_time, run.end_time)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {loading
            ? "Loading evolution runs..."
            : hideEmptyRuns
              ? "No evolution runs with invocations found"
              : "No evolution runs found"}
        </div>
      )}
    </div>
  )
}
