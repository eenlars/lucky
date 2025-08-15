"use client"

import { showToast } from "@/lib/toast-utils"
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
  const [_isNavigating, _setIsNavigating] = useState(false)
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
        // Clean up stale runs first via API
        const cleanupResponse = await fetch("/api/evolution-runs/cleanup", { method: "POST" })
        if (cleanupResponse.ok) {
          const cleanupData = await cleanupResponse.json()
          if (cleanupData.cleaned > 0) {
            showToast.info.processing(`Cleaned up ${cleanupData.cleaned} stale evolution runs`)
          }
        }

        const currentLoadedRuns = reset ? [] : loadedRuns
        const offset = currentLoadedRuns.length

        // Build query parameters
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
          status: statusFilter,
          mode: modeFilter,
          search: searchTerm,
          dateFilter: dateFilter,
          hideEmpty: hideEmptyRuns.toString()
        })

        // Use the API route to get runs with stats
        const response = await fetch(`/api/evolution-runs?${params}`)
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
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch evolution runs"
        setError(errorMessage)
        showToast.error.generic(errorMessage)
        console.error("Error fetching evolution runs:", err)
      } finally {
        if (showLoading) setLoading(false)
      }
    },
    [limit, statusFilter, modeFilter, searchTerm, dateFilter, hideEmptyRuns, loadedRuns]
  )

  useEffect(() => {
    fetchEvolutionRuns(true, true)
  }, [statusFilter, modeFilter, searchTerm, dateFilter, hideEmptyRuns, limit, fetchEvolutionRuns])

  const getSortValue = (
    run: EvolutionRunWithStats,
    field: keyof EvolutionRunWithStats
  ) => {
    if (field === "config") return run.config?.mode || ""
    return run[field]
  }

  const filteredAndSortedRuns = evolutionRuns
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
    if (sortField !== field) return "↕"
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
    evolutionRuns,
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
            Evolution Runs
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Monitor and analyze your workflow evolution experiments
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search runs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => fetchEvolutionRuns(true, true)}
              disabled={loading}
              className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="running">Running</option>
                <option value="interrupted">Interrupted</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Mode</label>
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Modes</option>
                <option value="cultural">Cultural</option>
                <option value="GP">Genetic Programming</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Time Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideEmptyRuns}
                  onChange={(e) => setHideEmptyRuns(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Hide empty runs</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Auto-refresh</span>
              </label>

              {autoRefresh && (
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>Every 5s</option>
                  <option value={10}>Every 10s</option>
                  <option value={30}>Every 30s</option>
                  <option value={60}>Every 1m</option>
                </select>
              )}

              <button
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                  setModeFilter("all")
                  setDateFilter("all")
                  setHideEmptyRuns(false)
                  setSortField(null)
                }}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Clear filters
              </button>
            </div>

            <div className="flex items-center gap-6">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {evolutionRuns.length} runs{hasMore && " loaded"}
              </span>

              {evolutionRuns.some((run) => run.status === "running") && (
                <span className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  {evolutionRuns.filter((run) => run.status === "running").length} running
                </span>
              )}

              {hasMore && (
                <button
                  onClick={() => fetchEvolutionRuns(true, false)}
                  disabled={loading}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Load more
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

      {/* Results Table */}
      {filteredAndSortedRuns.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort("run_id")}
                >
                  <div className="flex items-center gap-1">
                    <span>Run ID</span>
                    <span className="text-gray-400">{getSortIcon("run_id")}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort("goal_text")}
                >
                  <div className="flex items-center gap-1">
                    <span>Goal</span>
                    <span className="text-gray-400">{getSortIcon("goal_text")}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <span className="text-gray-400">{getSortIcon("status")}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort("config")}
                >
                  <div className="flex items-center gap-1">
                    <span>Type</span>
                    <span className="text-gray-400">{getSortIcon("config")}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort("generation_count")}
                >
                  <div className="flex items-center gap-1">
                    <span>Generations</span>
                    <span className="text-gray-400">{getSortIcon("generation_count")}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort("start_time")}
                >
                  <div className="flex items-center gap-1">
                    <span>Started</span>
                    <span className="text-gray-400">{getSortIcon("start_time")}</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedRuns.map((run, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    <Link
                      href={`/evolution/${run.run_id}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                      onClick={() => _setIsNavigating(true)}
                    >
                      {run.run_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    <Link
                      href={`/evolution/${run.run_id}`}
                      className="block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                    >
                      <div
                        className="max-w-md truncate"
                        title={run.goal_text}
                      >
                        {run.goal_text}
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/evolution/${run.run_id}`}
                      className="block"
                    >
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          run.status === "completed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : run.status === "running"
                              ? isStaleRun(run)
                                ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : run.status === "failed"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                : run.status === "interrupted"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {run.status === "running" && isStaleRun(run)
                          ? "stale"
                          : run.status}
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    <Link
                      href={`/evolution/${run.run_id}`}
                      className="capitalize"
                    >
                      {run.config?.mode || "unknown"}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    <Link
                      href={`/evolution/${run.run_id}`}
                      className="tabular-nums"
                    >
                      {run.generation_count || 0}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <Link
                      href={`/evolution/${run.run_id}`}
                      className="block"
                    >
                      {dayjs(run.start_time).fromNow()}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    <Link
                      href={`/evolution/${run.run_id}`}
                      className="tabular-nums"
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              {loading
                ? "Loading evolution runs..."
                : hideEmptyRuns
                  ? "No evolution runs with invocations found"
                  : "No evolution runs found"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {!loading && "Try adjusting your filters or creating a new evolution run."}
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
