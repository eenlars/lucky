"use client"

import { EmptyState } from "@/components/empty-states/EmptyState"
import { HelpTooltip, helpContent } from "@/components/help/HelpTooltip"
import { TableSkeleton } from "@/components/loading/Skeleton"
import { Button } from "@/components/ui/button"
import { useDeleteInvocations } from "@/hooks/queries/useInvocationMutations"
import { useInvocationsQuery } from "@/hooks/queries/useInvocationsQuery"
import { showToast } from "@/lib/toast-utils"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { Filter, Rocket, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { DeleteConfirmDialog } from "./components/DeleteConfirmDialog"
import { FiltersPanel } from "./components/FiltersPanel"
import { InvocationsTable } from "./components/InvocationsTable"
import { SummaryCards } from "./components/SummaryCards"
import type { FilterState, SortField, SortOrder, WorkflowInvocationFilters } from "./lib/types"

dayjs.extend(relativeTime)

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

    if (showCompletedOnly) {
      params.status = "completed"
    } else if (filters.status) {
      params.status = filters.status as "running" | "completed" | "failed" | "rolled_back"
    }

    if (filters.minCost) params.minCost = Number.parseFloat(filters.minCost)
    if (filters.maxCost) params.maxCost = Number.parseFloat(filters.maxCost)
    if (filters.dateFrom) params.dateFrom = filters.dateFrom
    if (filters.dateTo) params.dateTo = filters.dateTo
    if (filters.minAccuracy) params.minAccuracy = Number.parseFloat(filters.minAccuracy)
    if (filters.maxAccuracy) params.maxAccuracy = Number.parseFloat(filters.maxAccuracy)
    if (filters.minFitnessScore) params.minFitness = Number.parseFloat(filters.minFitnessScore)
    if (filters.maxFitnessScore) params.maxFitness = Number.parseFloat(filters.maxFitnessScore)

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
  const aggregates = data?.aggregates ?? { totalSpent: 0, avgAccuracy: null, failedCount: 0 }

  const deleteInvocationsMutation = useDeleteInvocations()

  // Reset to page 1 when filters or sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filterParams, sortField, sortOrder])

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

  const hasActiveFilters =
    filters.status ||
    filters.minCost ||
    filters.maxCost ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.minAccuracy ||
    filters.maxAccuracy ||
    filters.minFitnessScore ||
    filters.maxFitnessScore ||
    showCompletedOnly

  return (
    <div className="p-6">
      {/* Header */}
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

      {/* Controls */}
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
            <label htmlFor="items-per-page" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Items per page:
            </label>
            <select
              id="items-per-page"
              value={itemsPerPage}
              onChange={e => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
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

        {showFilters && <FiltersPanel filters={filters} onFilterChange={setFilters} onClearFilters={clearFilters} />}

        {error && <div className="mt-2 text-red-500">{error.message}</div>}

        {/* Summary Cards */}
        {invocations.length > 0 && <SummaryCards aggregates={aggregates} totalItems={totalItems} />}

        {/* Active Filters Indicator */}
        {hasActiveFilters && (
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

      {/* Content */}
      {invocations.length > 0 ? (
        <InvocationsTable
          invocations={invocations}
          selectedRows={selectedRows}
          sortField={sortField}
          sortOrder={sortOrder}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          totalPages={totalPages}
          onSort={handleSort}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
          onPageChange={setCurrentPage}
        />
      ) : isLoading ? (
        <TableSkeleton rows={itemsPerPage} columns={8} />
      ) : hasActiveFilters ? (
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
          title="Your workflow history will appear here"
          description="Track costs, accuracy, and performance for every workflow run. Each execution gives you data to optimize and improve your workflows."
          action={{
            label: "Run your first workflow",
            href: "/workflows",
          }}
          secondaryAction={{
            label: "Create new workflow",
            href: "/edit",
          }}
        />
      )}

      {/* Mutation loading indicators */}
      {deleteInvocationsMutation.isPending && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white px-4 py-2 rounded-md flex items-center gap-2">
          <div className="size-4 animate-spin rounded-full border border-current border-t-transparent" />
          {deleteInvocationsMutation.isPending && "Deleting..."}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteConfirmOpen}
        selectedCount={selectedRows.size}
        isDeleting={deleteInvocationsMutation.isPending}
        onConfirm={handleDeleteSelected}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  )
}
