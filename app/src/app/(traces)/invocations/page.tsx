"use client"

import {
  deleteWorkflowInvocations,
  retrieveWorkflowInvocations,
  type WorkflowInvocationFilters,
  type WorkflowInvocationSortOptions,
} from "@/trace-visualization/db/Workflow/retrieveWorkflow"
import type { Tables } from "@core/utils/clients/supabase/types"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { ChevronDown, ChevronUp, Filter, Trash2, X } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

// Temporary type extension for new scoring fields
type WorkflowInvocationWithScores = Tables<"WorkflowInvocation"> & {
  accuracy?: number | null
  fitness_score?: number | null
}
// initialize dayjs plugins
dayjs.extend(relativeTime)

// calculate time difference in a human-readable format
const getTimeDifference = (timestamp: string) => {
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

type SortField =
  | "start_time"
  | "usd_cost"
  | "status"
  | "fitness"
  | "accuracy"
  | "duration"
type SortOrder = "asc" | "desc"

interface FilterState {
  status: string
  minCost: string
  maxCost: string
  dateFrom: string
  dateTo: string
  minAccuracy: string
  maxAccuracy: string
  minFitnessScore: string
  maxFitnessScore: string
}

export default function InvocationsPage() {
  const [invocations, setInvocations] = useState<
    WorkflowInvocationWithScores[]
  >([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>("start_time")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [showFilters, setShowFilters] = useState(false)
  const [showCompletedOnly, setShowCompletedOnly] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    status: "",
    minCost: "",
    maxCost: "",
    dateFrom: "",
    dateTo: "",
    minAccuracy: "",
    maxAccuracy: "",
    minFitnessScore: "",
    maxFitnessScore: "",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  // Add state to force re-render for updating time differences
  const [_, setTimeUpdate] = useState(0)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchWorkflowInvocations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Skip cleanup on page load to prevent timeouts
      // TODO: Move cleanup to background job or API endpoint

      // Build filter parameters
      const filterParams: WorkflowInvocationFilters = {}

      // Status filter
      if (filters.status) {
        filterParams.status = filters.status as
          | "running"
          | "completed"
          | "failed"
          | "rolled_back"
      }

      // Cost filters
      if (filters.minCost) {
        filterParams.minCost = parseFloat(filters.minCost)
      }
      if (filters.maxCost) {
        filterParams.maxCost = parseFloat(filters.maxCost)
      }

      // Date filters
      if (filters.dateFrom) {
        filterParams.dateFrom = filters.dateFrom
      }
      if (filters.dateTo) {
        filterParams.dateTo = filters.dateTo
      }

      // Accuracy filters
      if (filters.minAccuracy) {
        filterParams.minAccuracy = parseFloat(filters.minAccuracy)
      }
      if (filters.maxAccuracy) {
        filterParams.maxAccuracy = parseFloat(filters.maxAccuracy)
      }

      // Fitness score filters
      if (filters.minFitnessScore) {
        filterParams.minFitnessScore = parseFloat(filters.minFitnessScore)
      }
      if (filters.maxFitnessScore) {
        filterParams.maxFitnessScore = parseFloat(filters.maxFitnessScore)
      }

      // Override with completed only filter if active
      if (showCompletedOnly) {
        filterParams.status = "completed"
      }

      // Build sort parameters
      const sortParams: WorkflowInvocationSortOptions = {
        field: sortField,
        order: sortOrder,
      }

      const response = await retrieveWorkflowInvocations(
        currentPage,
        itemsPerPage,
        filterParams,
        sortParams
      )
      setInvocations(response.data)
      setTotalCount(response.totalCount)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch workflow invocations"
      )
      console.error("Error fetching workflow invocations:", err)
    } finally {
      setLoading(false)
    }
  }, [
    filters,
    sortField,
    sortOrder,
    showCompletedOnly,
    currentPage,
    itemsPerPage,
  ])

  useEffect(() => {
    fetchWorkflowInvocations()
  }, [fetchWorkflowInvocations])

  // Update time differences every second and auto-refresh every 30 seconds
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setTimeUpdate((prev) => prev + 1)
    }, 1000)

    // Auto-refresh every 30 seconds to catch status changes
    const refreshInterval = setInterval(() => {
      if (!loading) {
        fetchWorkflowInvocations()
      }
    }, 30000)

    return () => {
      clearInterval(timeInterval)
      clearInterval(refreshInterval)
    }
  }, [loading, fetchWorkflowInvocations])

  // No need for client-side pagination since backend handles it
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const totalItems = totalCount

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(invocations.map((inv) => inv.wf_invocation_id)))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectRow = (invocationId: string, checked: boolean) => {
    const newSelected = new Set(selectedRows)
    if (checked) {
      newSelected.add(invocationId)
    } else {
      newSelected.delete(invocationId)
    }
    setSelectedRows(newSelected)
  }

  const clearFilters = () => {
    setFilters({
      status: "",
      minCost: "",
      maxCost: "",
      dateFrom: "",
      dateTo: "",
      minAccuracy: "",
      maxAccuracy: "",
      minFitnessScore: "",
      maxFitnessScore: "",
    })
    setCurrentPage(1)
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, showCompletedOnly, sortField, sortOrder])

  const handleDeleteSelected = async () => {
    setDeleteLoading(true)
    setError(null)

    try {
      const idsToDelete = Array.from(selectedRows)
      await deleteWorkflowInvocations(idsToDelete)

      // Remove deleted items from the invocations list
      setInvocations(
        invocations.filter((inv) => !selectedRows.has(inv.wf_invocation_id))
      )
      setSelectedRows(new Set())
      setDeleteConfirmOpen(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete selected invocations"
      )
      console.error("Error deleting invocations:", err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const formatCost = (cost: number) => {
    if (cost >= 1) return `$${cost.toFixed(2)}`
    if (cost >= 0.01) return `$${cost.toFixed(4)}`
    return `$${cost.toFixed(6)}`
  }

  const formatDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return "Running..."
    const duration =
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
    if (duration < 60) return `${duration.toFixed(1)}s`
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}m ${seconds.toFixed(0)}s`
  }

  // Generate consistent emoji for WorkflowVersion IDs
  const getVersionEmoji = useMemo(() => {
    const emojiCache = new Map<string, string>()
    const emojis = [
      "🚀",
      "⭐",
      "🎯",
      "🔥",
      "💎",
      "🌟",
      "⚡",
      "🎨",
      "🎪",
      "🎭",
      "🎮",
      "🎸",
      "🎹",
      "🎺",
      "🎻",
      "🏆",
      "🏅",
      "🏃",
      "🏋️",
      "🏊",
      "🌈",
      "🌸",
      "🌺",
      "🌻",
      "🌼",
      "🍀",
      "🍁",
      "🍂",
      "🍃",
      "🍄",
      "🍎",
      "🍊",
      "🍋",
      "🍌",
      "🍉",
      "🍇",
      "🍓",
      "🍑",
      "🍒",
      "🍟",
      "🎂",
      "🎄",
      "🎈",
      "🎉",
      "🎊",
      "🎋",
      "🎌",
      "🎍",
      "🎎",
      "🎏",
      "💫",
      "🔮",
      "🎆",
      "🎇",
      "🎁",
      "🎀",
      "🌍",
      "🌎",
      "🌏",
      "🌕",
      "🌖",
      "🌗",
      "🌘",
      "🌙",
      "🌚",
      "🌛",
      "🌜",
      "🌝",
      "🌞",
      "🌟",
      "🌠",
      "☀️",
      "🌤️",
      "⛅",
      "🌥️",
      "☁️",
      "🌦️",
      "🌧️",
      "⛈️",
      "🌩️",
      "❄️",
      "☃️",
      "⛄",
      "🌨️",
      "🌬️",
      "💨",
      "🌪️",
      "🌊",
      "💧",
      "💦",
      "🌹",
      "🌷",
      "🌺",
      "🌻",
      "🌼",
      "🌸",
      "🌱",
      "🌿",
      "🍀",
      "🌾",
      "🌵",
      "🌴",
      "🌲",
      "🌳",
      "🌰",
      "🥥",
      "🥝",
      "🍅",
      "🥑",
      "🥕",
      "🌽",
      "🥒",
      "🥬",
      "🥦",
      "🧄",
      "🧅",
      "🥜",
      "🌰",
      "🍞",
      "🥐",
      "🥖",
      "🥨",
      "🥯",
      "🧀",
      "🥞",
      "🧇",
      "🥓",
      "🍳",
      "🥚",
      "🍕",
      "🍔",
      "🌭",
      "🥪",
      "🌮",
      "🌯",
      "🥙",
      "🥗",
      "🍝",
      "🍜",
      "🍲",
      "🍱",
      "🍣",
      "🍤",
      "🍙",
      "🍘",
      "🍚",
      "🍛",
      "🍰",
      "🧁",
      "🍮",
      "🍭",
      "🍬",
      "🍫",
      "🍿",
      "🍩",
      "🍪",
      "🎂",
      "🍰",
      "🧁",
      "🍯",
      "🥛",
      "☕",
      "🍵",
      "🧃",
      "🥤",
      "🧋",
      "🍶",
      "🍾",
      "🥂",
      "🍷",
      "🍸",
      "🍹",
      "🍺",
      "🍻",
      "🥃",
      "🧊",
      "🎵",
      "🎶",
      "🎤",
      "🎧",
      "📻",
      "🎷",
      "🎸",
      "🎹",
      "🎺",
      "🎻",
      "🥁",
      "🎼",
      "🎯",
      "🎳",
      "🎮",
      "🕹️",
      "🎰",
      "🎲",
      "🧩",
      "🎨",
      "🖌️",
      "🖍️",
      "🖊️",
      "✏️",
      "📝",
      "💼",
      "📁",
      "📂",
      "📅",
      "📆",
      "🗓️",
      "📇",
      "📈",
      "📉",
      "📊",
      "📋",
      "📌",
      "📍",
      "📎",
      "🖇️",
      "📏",
      "📐",
      "✂️",
      "🗃️",
      "🗄️",
      "🗑️",
      "🔒",
      "🔓",
      "🔏",
      "🔐",
      "🔑",
      "🗝️",
      "🔨",
      "⚒️",
      "🛠️",
      "🗡️",
      "⚔️",
      "🛡️",
      "🔧",
      "🔩",
      "⚙️",
      "🗜️",
      "⚖️",
      "🦽",
      "🦼",
      "🛴",
      "🛹",
      "🛼",
      "🚗",
      "🚙",
      "🚐",
      "🚛",
      "🚜",
      "🏎️",
      "🚓",
      "🚑",
      "🚒",
      "🚐",
      "🚚",
      "🚛",
      "🚜",
      "🏍️",
      "🛵",
      "🚲",
      "🛴",
      "🛹",
      "🛼",
      "🚁",
      "🛸",
      "🚀",
      "🛰️",
      "💺",
      "🎡",
      "🎢",
      "🎠",
      "🎪",
      "🎭",
      "🎨",
      "🎯",
      "🎱",
      "🎳",
      "🎮",
      "🕹️",
      "🎰",
      "🎲",
      "🧩",
      "🃏",
      "🀄",
      "🔮",
      "🎭",
      "🎪",
      "🎨",
      "🎬",
      "🎤",
      "🎧",
      "🎼",
      "🎵",
      "🎶",
      "🎸",
      "🎹",
      "🎺",
      "🎻",
      "🎯",
      "🎳",
      "🎮",
      "🕹️",
      "🎰",
      "🎲",
      "🧩",
      "🚀",
      "🛸",
      "🛰️",
      "⭐",
      "🌟",
      "💫",
      "⚡",
      "🔥",
      "💎",
      "🏆",
      "🏅",
      "🎖️",
      "🏵️",
      "🎗️",
    ]

    return (versionId: string): string => {
      if (emojiCache.has(versionId)) {
        return emojiCache.get(versionId)!
      }

      // Simple hash function to get consistent emoji for same ID
      let hash = 0
      for (let i = 0; i < versionId.length; i++) {
        const char = versionId.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32-bit integer
      }

      const emoji = emojis[Math.abs(hash) % emojis.length]
      emojiCache.set(versionId, emoji)
      return emoji
    }
  }, [])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-2">
          Workflow Invocations
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Each row represents a single workflow execution. The emoji in the
          Version column helps you quickly identify invocations from the same
          workflow version.
        </p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={fetchWorkflowInvocations}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 transition-colors cursor-pointer"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            )}
            {loading ? "Loading..." : "Refresh Invocations"}
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer"
          >
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>

          <button
            onClick={() => setShowCompletedOnly(!showCompletedOnly)}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer ${
              showCompletedOnly
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            ✓ {showCompletedOnly ? "Show All" : "Completed Only"}
          </button>

          <div className="flex items-center gap-2">
            <label
              htmlFor="items-per-page"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300"
            >
              Items per page:
            </label>
            <select
              id="items-per-page"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {selectedRows.size > 0 && (
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-blue-50 px-3 py-1 rounded-full">
                {selectedRows.size} selected
              </span>
              <button
                onClick={() => setSelectedRows(new Set())}
                className="text-sm font-medium text-gray-600 hover:text-gray-800 underline cursor-pointer transition-colors"
              >
                Clear selection
              </button>
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="inline-flex items-center px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </button>
            </div>
          )}
        </div>

        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="status-filter"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1"
                >
                  Status
                </label>
                <select
                  id="status-filter"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">All statuses</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="rolled_back">Rolled Back</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Min Cost ($)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={filters.minCost}
                  onChange={(e) =>
                    setFilters({ ...filters, minCost: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
                  placeholder="0.000001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Max Cost ($)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={filters.maxCost}
                  onChange={(e) =>
                    setFilters({ ...filters, maxCost: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
                  placeholder="1.000000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Min Accuracy
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={filters.minAccuracy}
                  onChange={(e) =>
                    setFilters({ ...filters, minAccuracy: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
                  placeholder="0.000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Max Accuracy
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={filters.maxAccuracy}
                  onChange={(e) =>
                    setFilters({ ...filters, maxAccuracy: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
                  placeholder="1.000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Min Fitness Score
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={filters.minFitnessScore}
                  onChange={(e) =>
                    setFilters({ ...filters, minFitnessScore: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
                  placeholder="0.000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Max Fitness Score
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={filters.maxFitnessScore}
                  onChange={(e) =>
                    setFilters({ ...filters, maxFitnessScore: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
                  placeholder="1.000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Date From
                </label>
                <input
                  type="datetime-local"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    setFilters({ ...filters, dateFrom: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Date To
                </label>
                <input
                  type="datetime-local"
                  value={filters.dateTo}
                  onChange={(e) =>
                    setFilters({ ...filters, dateTo: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-2 text-red-500">{(error as any).message}</div>
        )}

        {/* Active Filters Indicator */}
        {(filters.status ||
          filters.minCost ||
          filters.maxCost ||
          filters.dateFrom ||
          filters.dateTo ||
          filters.minAccuracy ||
          filters.maxAccuracy ||
          filters.minFitnessScore ||
          filters.maxFitnessScore ||
          showCompletedOnly) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-blue-900">
                Active Filters
              </h3>
              <button
                onClick={() => {
                  clearFilters()
                  setShowCompletedOnly(false)
                }}
                className="text-sm text-blue-700 hover:text-blue-900 underline"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {showCompletedOnly && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Completed Only
                </span>
              )}
              {filters.status && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Status: {filters.status}
                </span>
              )}
              {filters.minCost && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Min Cost: ${filters.minCost}
                </span>
              )}
              {filters.maxCost && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Max Cost: ${filters.maxCost}
                </span>
              )}
              {filters.minAccuracy && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Min Accuracy: {filters.minAccuracy}
                </span>
              )}
              {filters.maxAccuracy && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Max Accuracy: {filters.maxAccuracy}
                </span>
              )}
              {filters.minFitnessScore && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Min Fitness: {filters.minFitnessScore}
                </span>
              )}
              {filters.maxFitnessScore && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Max Fitness: {filters.maxFitnessScore}
                </span>
              )}
              {filters.dateFrom && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  From: {new Date(filters.dateFrom).toLocaleString()}
                </span>
              )}
              {filters.dateTo && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  To: {new Date(filters.dateTo).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {invocations.length > 0 ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 px-6 py-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <span>Showing</span>
              <span className="font-medium mx-1">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>
              <span>to</span>
              <span className="font-medium mx-1">
                {Math.min(currentPage * itemsPerPage, totalItems)}
              </span>
              <span>of</span>
              <span className="font-medium mx-1">{totalItems}</span>
              <span>results</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page
                </span>
                <span className="font-medium text-sm">{currentPage}</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  of
                </span>
                <span className="font-medium text-sm">{totalPages}</span>
              </div>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          selectedRows.size === invocations.length &&
                          invocations.length > 0
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-lg bg-gray-200 rounded-full w-6 h-6 flex items-center justify-center"
                          title="Workflow Version - Same emoji = Same version"
                        >
                          🔄
                        </span>
                        <span>Version</span>
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("start_time")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Invocation</span>
                        <SortIcon field="start_time" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Status</span>
                        <SortIcon field="status" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("accuracy")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Accuracy</span>
                        <SortIcon field="accuracy" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("fitness")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Fitness Score</span>
                        <SortIcon field="fitness" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("usd_cost")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Cost</span>
                        <SortIcon field="usd_cost" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("duration")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Duration</span>
                        <SortIcon field="duration" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {invocations.map((invocation, _index) => {
                    const isSelected = selectedRows.has(
                      invocation.wf_invocation_id
                    )
                    return (
                      <tr
                        key={invocation.wf_invocation_id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700"
                            : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              handleSelectRow(
                                invocation.wf_invocation_id,
                                e.target.checked
                              )
                            }
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/trace/${invocation.wf_invocation_id}`}
                            className="flex items-center gap-3 hover:text-blue-600 transition-colors group"
                          >
                            <span
                              className="text-2xl bg-gray-100 group-hover:bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
                              title={`Version: ${invocation.wf_version_id}`}
                            >
                              {getVersionEmoji(invocation.wf_version_id)}
                            </span>
                            <div className="flex flex-col">
                              <span className="font-mono text-xs text-gray-900 dark:text-gray-100">
                                {invocation.wf_version_id.substring(0, 12)}...
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Version ID
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/trace/${invocation.wf_invocation_id}`}
                            className="block hover:text-blue-600 transition-colors"
                          >
                            <div className="flex flex-col">
                              <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                                {invocation.wf_invocation_id.substring(0, 8)}...
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {new Date(
                                  invocation.start_time
                                ).toLocaleDateString()}
                              </span>
                              <span className="text-xs text-gray-400">
                                {getTimeDifference(invocation.start_time)}
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/trace/${invocation.wf_invocation_id}`}
                            className="block hover:text-blue-600 transition-colors"
                          >
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                invocation.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : invocation.status === "failed"
                                    ? "bg-red-100 text-red-800"
                                    : invocation.status === "running"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {invocation.status.charAt(0).toUpperCase() +
                                invocation.status.slice(1)}
                            </span>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/trace/${invocation.wf_invocation_id}`}
                            className="block hover:text-blue-600 transition-colors"
                          >
                            <div className="text-right">
                              <span
                                className={`${invocation.accuracy != null ? "text-green-600" : "text-gray-400"}`}
                              >
                                {invocation.accuracy != null
                                  ? invocation.accuracy.toFixed(3)
                                  : "n/a"}
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/trace/${invocation.wf_invocation_id}`}
                            className="block hover:text-blue-600 transition-colors"
                          >
                            <div className="text-right">
                              <span
                                className={`${invocation.fitness_score != null ? "text-purple-600 font-semibold" : "text-gray-400"}`}
                              >
                                {invocation.fitness_score != null
                                  ? invocation.fitness_score.toFixed(3)
                                  : "n/a"}
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/trace/${invocation.wf_invocation_id}`}
                            className="block hover:text-blue-600 transition-colors"
                          >
                            <div className="flex flex-col">
                              <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                                {formatCost(invocation.usd_cost)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                USD
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/trace/${invocation.wf_invocation_id}`}
                            className="block hover:text-blue-600 transition-colors"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-900 dark:text-gray-100">
                                {formatDuration(
                                  invocation.start_time,
                                  invocation.end_time
                                )}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {invocation.end_time ? "Completed" : "Running"}
                              </span>
                            </div>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 px-6 py-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <span>Showing</span>
              <span className="font-medium mx-1">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>
              <span>to</span>
              <span className="font-medium mx-1">
                {Math.min(currentPage * itemsPerPage, totalItems)}
              </span>
              <span>of</span>
              <span className="font-medium mx-1">{totalItems}</span>
              <span>results</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page
                </span>
                <span className="font-medium text-sm">{currentPage}</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  of
                </span>
                <span className="font-medium text-sm">{totalPages}</span>
              </div>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-center py-12">
          <div className="text-center">
            {loading ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 dark:text-gray-400">
                  Loading invocations...
                </p>
              </div>
            ) : invocations.length === 0 ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                    No invocations found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Start by creating your first workflow invocation.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🔍</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                    No matches found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Try adjusting your filters to see more results.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete {selectedRows.size} selected
              invocation{selectedRows.size > 1 ? "s" : ""}? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleteLoading}
                className="inline-flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 bg-white text-sm font-medium rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={deleteLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 transition-colors cursor-pointer"
              >
                {deleteLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                )}
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
