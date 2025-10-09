"use client"

import { EmptyState } from "@/components/empty-states/EmptyState"
import { HelpTooltip, helpContent } from "@/components/help/HelpTooltip"
import { TableSkeleton } from "@/components/loading/Skeleton"
import { Button } from "@/components/ui/button"
import { useDeleteInvocations } from "@/hooks/queries/useInvocationMutations"
import { useInvocationsQuery } from "@/hooks/queries/useInvocationsQuery"
import { showToast } from "@/lib/toast-utils"
import type { Database } from "@lucky/shared/client"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { ChevronDown, ChevronUp, Filter, Rocket, Trash2, X } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

// Temporary type extension for new scoring fields
type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]

type WorkflowInvocationWithScores = Tables<"WorkflowInvocation"> & {
  accuracy?: number | null
  fitness_score?: number | null
}
// Type definitions
interface WorkflowInvocationFilters {
  status?: string | string[]
  runId?: string
  generationId?: string
  wfVersionId?: string
  dateRange?: {
    start: string
    end: string
  }
  dateFrom?: string
  dateTo?: string
  hasFitnessScore?: boolean
  hasAccuracy?: boolean
  minCost?: number
  maxCost?: number
  minAccuracy?: number
  maxAccuracy?: number
  minFitnessScore?: number
  maxFitnessScore?: number
}

interface WorkflowInvocationSortOptions {
  field: string
  order: "asc" | "desc"
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

type SortField = "start_time" | "usd_cost" | "status" | "fitness" | "accuracy" | "duration"
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // Build filter parameters
  const filterParams = useMemo<WorkflowInvocationFilters>(() => {
    const params: WorkflowInvocationFilters = {}

    // Status filter (override with completed only filter if active)
    if (showCompletedOnly) {
      params.status = "completed"
    } else if (filters.status) {
      params.status = filters.status as "running" | "completed" | "failed" | "rolled_back"
    }

    // Cost filters
    if (filters.minCost) params.minCost = Number.parseFloat(filters.minCost)
    if (filters.maxCost) params.maxCost = Number.parseFloat(filters.maxCost)

    // Date filters
    if (filters.dateFrom) params.dateFrom = filters.dateFrom
    if (filters.dateTo) params.dateTo = filters.dateTo

    // Accuracy filters
    if (filters.minAccuracy) params.minAccuracy = Number.parseFloat(filters.minAccuracy)
    if (filters.maxAccuracy) params.maxAccuracy = Number.parseFloat(filters.maxAccuracy)

    // Fitness score filters
    if (filters.minFitnessScore) params.minFitnessScore = Number.parseFloat(filters.minFitnessScore)
    if (filters.maxFitnessScore) params.maxFitnessScore = Number.parseFloat(filters.maxFitnessScore)

    return params
  }, [filters, showCompletedOnly])

  // Use TanStack Query for data fetching with auto-refresh
  const { data, isLoading, error, refetch } = useInvocationsQuery({
    page: currentPage,
    pageSize: itemsPerPage,
    filters: filterParams,
    sortField,
    sortOrder,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  const invocations = data?.data ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const totalItems = totalCount

  const deleteInvocationsMutation = useDeleteInvocations()

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
      setSelectedRows(new Set(invocations.map(inv => inv.wf_invocation_id)))
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

  const handleDeleteSelected = async () => {
    try {
      const idsToDelete = Array.from(selectedRows)
      await deleteInvocationsMutation.mutateAsync(idsToDelete)
      setSelectedRows(new Set())
      setDeleteConfirmOpen(false)
      const count = idsToDelete.length
      showToast.success.delete(`Deleted ${count} invocation${count === 1 ? "" : "s"}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete selected invocations"
      showToast.error.generic(errorMessage)
      console.error("Error deleting invocations:", err)
    }
  }

  const formatCost = (cost: number) => {
    if (cost >= 1) return `$${cost.toFixed(2)}`
    if (cost >= 0.01) return `$${cost.toFixed(4)}`
    return `$${cost.toFixed(6)}`
  }

  const formatDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return "Running..."
    const duration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
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
    return sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Workflow History</h1>
            <HelpTooltip content={helpContent.invocation} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Every time you run a workflow, it appears here. Track performance, costs, and results for each run.
          </p>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Button onClick={() => refetch()} disabled={isLoading}>
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            )}
            {isLoading ? "Loading..." : "Refresh Invocations"}
          </Button>

          <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>

          <Button
            onClick={() => setShowCompletedOnly(!showCompletedOnly)}
            variant={showCompletedOnly ? "default" : "outline"}
          >
            ✓ {showCompletedOnly ? "Show All" : "Completed Only"}
          </Button>

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
              onChange={e => {
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
              <Button onClick={() => setSelectedRows(new Set())} variant="link" size="sm">
                Clear selection
              </Button>
              <Button onClick={() => setDeleteConfirmOpen(true)} variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
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
                  onChange={e => setFilters({ ...filters, status: e.target.value })}
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
                <label
                  htmlFor="min-cost"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1"
                >
                  Min Cost ($)
                </label>
                <input
                  id="min-cost"
                  type="number"
                  step="0.000001"
                  value={filters.minCost}
                  onChange={e => setFilters({ ...filters, minCost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
                  placeholder="0.000001"
                />
              </div>

              <div>
                <label
                  htmlFor="max-cost"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1"
                >
                  Max Cost ($)
                </label>
                <input
                  id="max-cost"
                  type="number"
                  step="0.000001"
                  value={filters.maxCost}
                  onChange={e => setFilters({ ...filters, maxCost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
                  placeholder="1.000000"
                />
              </div>

              <div>
                <label
                  htmlFor="min-accuracy"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1"
                >
                  Min Accuracy
                </label>
                <input
                  id="min-accuracy"
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={filters.minAccuracy}
                  onChange={e => setFilters({ ...filters, minAccuracy: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
                  placeholder="0.000"
                />
              </div>

              <div>
                <label
                  htmlFor="max-accuracy"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1"
                >
                  Max Accuracy
                </label>
                <input
                  id="max-accuracy"
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={filters.maxAccuracy}
                  onChange={e => setFilters({ ...filters, maxAccuracy: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
                  placeholder="1.000"
                />
              </div>

              <div>
                <label
                  htmlFor="min-fitness"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1"
                >
                  Min Fitness Score
                </label>
                <input
                  id="min-fitness"
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={filters.minFitnessScore}
                  onChange={e => setFilters({ ...filters, minFitnessScore: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
                  placeholder="0.000"
                />
              </div>

              <div>
                <label
                  htmlFor="max-fitness"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1"
                >
                  Max Fitness Score
                </label>
                <input
                  id="max-fitness"
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={filters.maxFitnessScore}
                  onChange={e => setFilters({ ...filters, maxFitnessScore: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
                  placeholder="1.000"
                />
              </div>

              <div>
                <label
                  htmlFor="date-from"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1"
                >
                  Date From
                </label>
                <input
                  id="date-from"
                  type="datetime-local"
                  value={filters.dateFrom}
                  onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label
                  htmlFor="date-to"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1"
                >
                  Date To
                </label>
                <input
                  id="date-to"
                  type="datetime-local"
                  value={filters.dateTo}
                  onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-end">
                <Button onClick={clearFilters} variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        )}

        {error && <div className="mt-2 text-red-500">{error.message}</div>}

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
              <h3 className="text-sm font-medium text-blue-900">Active Filters</h3>
              <Button
                onClick={() => {
                  clearFilters()
                  setShowCompletedOnly(false)
                }}
                variant="link"
                size="sm"
                className="text-blue-700 hover:text-blue-900"
              >
                Clear All
              </Button>
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
              <span className="font-medium mx-1">{(currentPage - 1) * itemsPerPage + 1}</span>
              <span>to</span>
              <span className="font-medium mx-1">{Math.min(currentPage * itemsPerPage, totalItems)}</span>
              <span>of</span>
              <span className="font-medium mx-1">{totalItems}</span>
              <span>results</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">Page</span>
                <span className="font-medium text-sm">{currentPage}</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">of</span>
                <span className="font-medium text-sm">{totalPages}</span>
              </div>
              <Button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
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
                        checked={selectedRows.size === invocations.length && invocations.length > 0}
                        onChange={e => handleSelectAll(e.target.checked)}
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
                        <HelpTooltip content={helpContent.accuracy} />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("fitness")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Fitness</span>
                        <SortIcon field="fitness" />
                        <HelpTooltip content={helpContent.fitness} />
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
                    const isSelected = selectedRows.has(invocation.wf_invocation_id)
                    return (
                      <tr
                        key={invocation.wf_invocation_id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          isSelected ? "bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700" : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => handleSelectRow(invocation.wf_invocation_id, e.target.checked)}
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
                              <span className="text-xs text-gray-500 dark:text-gray-400">Version ID</span>
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
                                {new Date(invocation.start_time).toLocaleDateString()}
                              </span>
                              <span className="text-xs text-gray-400">{getTimeDifference(invocation.start_time)}</span>
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
                              {invocation.status.charAt(0).toUpperCase() + invocation.status.slice(1)}
                            </span>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/trace/${invocation.wf_invocation_id}`}
                            className="block hover:text-blue-600 transition-colors"
                          >
                            <div className="text-right">
                              <span className={`${invocation.accuracy != null ? "text-green-600" : "text-gray-400"}`}>
                                {invocation.accuracy != null ? invocation.accuracy.toFixed(3) : "n/a"}
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
                                {invocation.fitness_score != null ? invocation.fitness_score.toFixed(3) : "n/a"}
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
                              <span className="text-xs text-gray-500 dark:text-gray-400">USD</span>
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
                                {formatDuration(invocation.start_time, invocation.end_time)}
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
              <span className="font-medium mx-1">{(currentPage - 1) * itemsPerPage + 1}</span>
              <span>to</span>
              <span className="font-medium mx-1">{Math.min(currentPage * itemsPerPage, totalItems)}</span>
              <span>of</span>
              <span className="font-medium mx-1">{totalItems}</span>
              <span>results</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">Page</span>
                <span className="font-medium text-sm">{currentPage}</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">of</span>
                <span className="font-medium text-sm">{totalPages}</span>
              </div>
              <Button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <TableSkeleton rows={itemsPerPage} columns={8} />
      ) : invocations.length === 0 &&
        (filters.status ||
          filters.minCost ||
          filters.maxCost ||
          filters.dateFrom ||
          filters.dateTo ||
          filters.minAccuracy ||
          filters.maxAccuracy ||
          filters.minFitnessScore ||
          filters.maxFitnessScore ||
          showCompletedOnly) ? (
        <EmptyState
          icon="🔍"
          title="No matches found"
          description="Try adjusting your filters to see more results."
          action={{
            label: "Clear filters",
            onClick: () => {
              clearFilters()
              setShowCompletedOnly(false)
            },
          }}
        />
      ) : (
        <EmptyState
          icon={Rocket}
          title="No runs yet"
          description="Create and run your first workflow to see it appear here. Each run shows you exactly how your workflow performed."
          action={{
            label: "Create workflow",
            href: "/edit",
          }}
          secondaryAction={{
            label: "Quick start demo",
            href: "/",
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete {selectedRows.size} selected invocation{selectedRows.size > 1 ? "s" : ""}?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleteInvocationsMutation.isPending}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteSelected}
                disabled={deleteInvocationsMutation.isPending}
                variant="destructive"
              >
                {deleteInvocationsMutation.isPending && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                )}
                {deleteInvocationsMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
