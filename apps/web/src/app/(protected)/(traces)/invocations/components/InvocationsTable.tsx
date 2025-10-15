import { HelpTooltip, helpContent } from "@/components/help/HelpTooltip"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { getVersionEmoji } from "../lib/emoji-utils"
import { extractGoalFromInput, formatCost, formatDuration, getTimeDifference } from "../lib/formatters"
import type { SortField, SortOrder, WorkflowInvocationWithScores } from "../lib/types"

interface InvocationsTableProps {
  invocations: WorkflowInvocationWithScores[]
  selectedRows: Set<string>
  sortField: SortField
  sortOrder: SortOrder
  currentPage: number
  itemsPerPage: number
  totalItems: number
  totalPages: number
  onSort: (field: SortField) => void
  onSelectAll: (checked: boolean) => void
  onSelectRow: (invocationId: string, checked: boolean) => void
  onPageChange: (page: number) => void
}

function SortIcon({ field, sortField, sortOrder }: { field: SortField; sortField: SortField; sortOrder: SortOrder }) {
  if (sortField !== field) return null
  return sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
}

export function InvocationsTable({
  invocations,
  selectedRows,
  sortField,
  sortOrder,
  currentPage,
  itemsPerPage,
  totalItems,
  totalPages,
  onSort,
  onSelectAll,
  onSelectRow,
  onPageChange,
}: InvocationsTableProps) {
  return (
    <div className="space-y-4">
      {/* Pagination Top */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center text-[12px] text-muted-foreground">
          <span>Showing</span>
          <span className="font-medium mx-1">{(currentPage - 1) * itemsPerPage + 1}</span>
          <span>to</span>
          <span className="font-medium mx-1">{Math.min(currentPage * itemsPerPage, totalItems)}</span>
          <span>of</span>
          <span className="font-medium mx-1">{totalItems}</span>
          <span>results</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
            className="h-8 text-[12px]"
          >
            Previous
          </Button>
          <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
            <span>Page</span>
            <span className="font-medium">{currentPage}</span>
            <span>of</span>
            <span className="font-medium">{totalPages}</span>
          </div>
          <Button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
            className="h-8 text-[12px]"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="flex items-center gap-4 px-4 h-10 border-b border-border/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        <div className="w-6 flex-shrink-0">
          <input
            type="checkbox"
            checked={selectedRows.size === invocations.length && invocations.length > 0}
            onChange={e => onSelectAll(e.target.checked)}
            className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary/20"
          />
        </div>
        <div className="flex-1 min-w-0">Workflow & Goal</div>
        <button
          type="button"
          onClick={() => onSort("start_time")}
          className="flex items-center gap-1 flex-shrink-0 hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
        >
          <span>Started</span>
          <SortIcon field="start_time" sortField={sortField} sortOrder={sortOrder} />
        </button>
        <button
          type="button"
          onClick={() => onSort("status")}
          className="flex items-center gap-1 w-20 flex-shrink-0 hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
        >
          <span>Status</span>
          <SortIcon field="status" sortField={sortField} sortOrder={sortOrder} />
        </button>
        <button
          type="button"
          onClick={() => onSort("accuracy")}
          className="flex items-center gap-1 w-20 flex-shrink-0 hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
        >
          <span>Accuracy</span>
          <SortIcon field="accuracy" sortField={sortField} sortOrder={sortOrder} />
          <HelpTooltip content={helpContent.accuracy} />
        </button>
        <button
          type="button"
          onClick={() => onSort("fitness")}
          className="flex items-center gap-1 w-20 flex-shrink-0 hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
        >
          <span>Fitness</span>
          <SortIcon field="fitness" sortField={sortField} sortOrder={sortOrder} />
          <HelpTooltip content={helpContent.fitness} />
        </button>
        <button
          type="button"
          onClick={() => onSort("usd_cost")}
          className="flex items-center gap-1 w-20 flex-shrink-0 hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
        >
          <span>Cost</span>
          <SortIcon field="usd_cost" sortField={sortField} sortOrder={sortOrder} />
        </button>
        <button
          type="button"
          onClick={() => onSort("duration")}
          className="flex items-center gap-1 w-20 flex-shrink-0 hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
        >
          <span>Duration</span>
          <SortIcon field="duration" sortField={sortField} sortOrder={sortOrder} />
        </button>
      </div>

      {/* Invocation Rows */}
      <div className="border border-border/30 rounded-lg overflow-hidden">
        {invocations.map((invocation, index) => {
          const isSelected = selectedRows.has(invocation.wf_invocation_id)
          const isRecent = Date.now() - new Date(invocation.start_time).getTime() < 60 * 60 * 1000
          const goal = extractGoalFromInput(invocation.workflow_input)

          return (
            <div
              key={invocation.wf_invocation_id}
              className={cn(
                "relative flex items-center gap-4 px-4 h-16 transition-all duration-[80ms] ease-out group",
                index < invocations.length - 1 && "border-b border-border/30",
                isSelected && "bg-primary/5",
                !isSelected && "hover:bg-black/[0.03] dark:hover:bg-white/[0.06]",
                isRecent && !isSelected && "bg-yellow-50/50 dark:bg-yellow-900/10",
              )}
            >
              {/* Left accent bar */}
              <div
                className={cn(
                  "absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-full transition-opacity duration-[80ms] ease-out",
                  isSelected ? "bg-primary opacity-100" : "bg-primary opacity-0 group-hover:opacity-100",
                )}
                aria-hidden="true"
              />

              {/* Checkbox */}
              <div className="w-6 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={e => onSelectRow(invocation.wf_invocation_id, e.target.checked)}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary/20"
                />
              </div>

              {/* Workflow & Goal */}
              <div className="flex-1 min-w-0">
                <Link href={`/trace/${invocation.wf_invocation_id}`} className="block group/link">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg flex-shrink-0" title={`Version: ${invocation.wf_version_id}`}>
                      {getVersionEmoji(invocation.wf_version_id)}
                    </span>
                    <span className="font-semibold text-[14px] leading-[20px] text-foreground group-hover/link:underline truncate">
                      {invocation.WorkflowVersion?.Workflow?.description || "Unnamed Workflow"}
                    </span>
                  </div>
                  <div className="text-[12px] text-muted-foreground truncate" title={goal}>
                    {goal}
                  </div>
                </Link>
              </div>

              {/* Started */}
              <div className="flex-shrink-0 text-[12px] text-muted-foreground text-right">
                <div>{new Date(invocation.start_time).toLocaleDateString()}</div>
                <div className="text-[11px]">{getTimeDifference(invocation.start_time)}</div>
              </div>

              {/* Status */}
              <div className="w-20 flex-shrink-0">
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-full rounded-lg px-2 py-1 text-[11px] font-medium",
                    invocation.status === "completed" &&
                      "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
                    invocation.status === "failed" && "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
                    invocation.status === "running" &&
                      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
                    invocation.status === "rolled_back" &&
                      "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400",
                  )}
                >
                  {invocation.status.charAt(0).toUpperCase() + invocation.status.slice(1)}
                </span>
              </div>

              {/* Accuracy */}
              <div className="w-20 flex-shrink-0 text-[12px] text-right font-mono">
                <span
                  className={
                    invocation.accuracy != null ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                  }
                >
                  {invocation.accuracy != null ? invocation.accuracy.toFixed(3) : "n/a"}
                </span>
              </div>

              {/* Fitness */}
              <div className="w-20 flex-shrink-0 text-[12px] text-right font-mono">
                <span
                  className={
                    invocation.fitness_score != null
                      ? "text-purple-600 dark:text-purple-400 font-semibold"
                      : "text-muted-foreground"
                  }
                >
                  {invocation.fitness_score != null ? invocation.fitness_score.toFixed(3) : "n/a"}
                </span>
              </div>

              {/* Cost */}
              <div className="w-20 flex-shrink-0 text-[12px] text-right font-mono">
                <span className="text-foreground">{formatCost(invocation.usd_cost)}</span>
              </div>

              {/* Duration */}
              <div className="w-20 flex-shrink-0 text-[12px] text-right">
                <span className="text-foreground">{formatDuration(invocation.start_time, invocation.end_time)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination Bottom */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center text-[12px] text-muted-foreground">
          <span>Showing</span>
          <span className="font-medium mx-1">{(currentPage - 1) * itemsPerPage + 1}</span>
          <span>to</span>
          <span className="font-medium mx-1">{Math.min(currentPage * itemsPerPage, totalItems)}</span>
          <span>of</span>
          <span className="font-medium mx-1">{totalItems}</span>
          <span>results</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
            className="h-8 text-[12px]"
          >
            Previous
          </Button>
          <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
            <span>Page</span>
            <span className="font-medium">{currentPage}</span>
            <span>of</span>
            <span className="font-medium">{totalPages}</span>
          </div>
          <Button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
            className="h-8 text-[12px]"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
