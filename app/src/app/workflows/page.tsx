"use client"

import { useState } from "react"
import Link from "next/link"
import { Play, Pencil, Plus, Trash2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkflows } from "@/hooks/useWorkflows"
import type { WorkflowWithVersions } from "@/lib/workflows"

function WorkflowRow({
  workflow,
  onRun,
  onDelete,
  isRunning,
}: {
  workflow: WorkflowWithVersions
  onRun: (workflow: WorkflowWithVersions) => void
  onDelete: (workflowId: string) => void
  isRunning: boolean
}) {
  const hasActiveVersion = workflow.activeVersion !== null
  const versionCount = workflow.versionCount || 0
  const timeAgo = workflow.updated_at ? formatTimeAgo(new Date(workflow.updated_at)) : null

  return (
    <div className="relative flex items-center gap-4 px-4 h-14 border-b border-border/30 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-all duration-[80ms] ease-out group">
      <div
        className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-[80ms] ease-out"
        aria-hidden="true"
      />

      {/* Name/Description */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/edit/${workflow.wf_id}`}
          className="font-semibold text-[14px] leading-[20px] text-foreground hover:underline truncate block"
          title={workflow.description}
        >
          {workflow.description}
        </Link>
      </div>

      {/* Version Info */}
      <div className="flex-shrink-0 text-[12px] text-muted-foreground min-w-[120px]">
        {versionCount > 0 ? (
          <span
            title={`${versionCount} version${versionCount === 1 ? "" : "s"}${timeAgo ? ` • Updated ${timeAgo}` : ""}`}
          >
            {versionCount} version{versionCount === 1 ? "" : "s"}
            {timeAgo ? ` • ${timeAgo}` : ""}
          </span>
        ) : (
          <span className="text-muted-foreground/60">No versions</span>
        )}
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        <span
          className={cn(
            "inline-flex items-center rounded-lg px-2.5 py-1 text-[12px]",
            hasActiveVersion
              ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          {hasActiveVersion ? "Active" : "Draft"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onRun(workflow)}
          disabled={!hasActiveVersion || isRunning}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-all duration-[80ms] ease-out active:scale-[0.98]",
            "focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2",
            hasActiveVersion && !isRunning
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
          title={!hasActiveVersion ? "No active version" : undefined}
        >
          {isRunning ? (
            <>
              <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
              Running...
            </>
          ) : (
            <>
              <Play className="size-3" />
              Run
            </>
          )}
        </button>

        <Link
          href={`/edit/${workflow.wf_id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all duration-[80ms] ease-out active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2"
        >
          <Pencil className="size-3" />
          Edit
        </Link>

        <button
          onClick={() => onDelete(workflow.wf_id)}
          className="inline-flex items-center gap-1.5 px-2 py-1.5 text-[12px] font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-all duration-[80ms] ease-out active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-red-500/70 focus:ring-offset-2"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return "just now"
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays <= 7) return `${diffInDays}d ago`

  return date.toLocaleDateString()
}

export default function WorkflowsPage() {
  const [runningWorkflows, setRunningWorkflows] = useState<Set<string>>(new Set())
  const { workflows, loading, saving, error, refresh, deleteWorkflow } = useWorkflows()

  const handleRun = async (workflow: any) => {
    if (!workflow.activeVersion) return

    setRunningWorkflows((prev) => new Set(prev).add(workflow.wf_id))

    // TODO: Implement actual workflow execution
    setTimeout(() => {
      setRunningWorkflows((prev) => {
        const next = new Set(prev)
        next.delete(workflow.wf_id)
        return next
      })
      console.log(`Workflow "${workflow.description}" started`)
    }, 2000)
  }

  const handleDelete = async (workflowId: string) => {
    if (confirm("Are you sure you want to delete this workflow?")) {
      await deleteWorkflow(workflowId)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] leading-[30px] font-semibold text-foreground">Workflows</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage your workflow configurations and versions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 p-2 text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </button>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-md hover:bg-primary/90 transition-all duration-[80ms] ease-out active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2"
          >
            <Plus className="size-4" />
            Create Workflow
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-200 text-red-700 rounded-md dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Content */}
      {loading && workflows.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">No workflows yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">Create your first workflow to get started</p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-md hover:bg-primary/90 transition-all duration-[80ms] ease-out active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2"
          >
            <Plus className="size-4" />
            Create Workflow
          </Link>
        </div>
      ) : (
        <div>
          {workflows.map((workflow: WorkflowWithVersions) => (
            <WorkflowRow
              key={workflow.wf_id}
              workflow={workflow}
              onRun={handleRun}
              onDelete={handleDelete}
              isRunning={runningWorkflows.has(workflow.wf_id)}
            />
          ))}
        </div>
      )}

      {/* Saving indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white px-4 py-2 rounded-md flex items-center gap-2">
          <div className="size-4 animate-spin rounded-full border border-current border-t-transparent" />
          Saving...
        </div>
      )}
    </div>
  )
}
