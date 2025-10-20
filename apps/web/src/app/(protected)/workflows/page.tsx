"use client"

import { AlertDialog } from "@/components/ui/alert-dialog"
import { useInvokeWorkflow } from "@/hooks/queries/useInvocationMutations"
import { useDeleteWorkflow } from "@/hooks/queries/useWorkflowMutations"
import { logException } from "@/lib/error-logger"
import { cn } from "@/lib/utils"
import type { WorkflowWithVersions } from "@/lib/workflows"
import { useWorkflowStore } from "@/stores/workflow-store"
import { useAuth } from "@clerk/nextjs"
import { Pencil, Play, Plus, RefreshCw, Trash2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

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

  const latestVersionId = workflow.activeVersion?.wf_version_id
  const editHref = latestVersionId ? `/edit/${latestVersionId}` : `/edit/${workflow.wf_id}`

  return (
    <div className="relative flex items-center gap-4 px-4 h-14 border-b border-border/30 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-all duration-[80ms] ease-out group">
      <div
        className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-[80ms] ease-out"
        aria-hidden="true"
      />

      {/* Name/Description */}
      <div className="flex-1 min-w-0">
        <Link
          href={editHref}
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
              : "bg-muted text-muted-foreground",
          )}
        >
          {hasActiveVersion ? "Active" : "Draft"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => onRun(workflow)}
          disabled={!hasActiveVersion || isRunning}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-all duration-[80ms] ease-out active:scale-[0.98]",
            "focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2",
            hasActiveVersion && !isRunning
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed",
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
          href={editHref}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all duration-[80ms] ease-out active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2"
        >
          <Pencil className="size-3" />
          Edit
        </Link>

        <button
          type="button"
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
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    workflowId: string | null
  }>({
    open: false,
    workflowId: null,
  })
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean
    title: string
    description: string
    variant?: "default" | "error" | "success"
  }>({
    open: false,
    title: "",
    description: "",
    variant: "default",
  })

  // Check auth state before loading workflows
  const { isLoaded, isSignedIn } = useAuth()

  // Use Zustand store for optimistic loading
  const { workflows, loading: isLoading, error, loadWorkflows, removeWorkflow } = useWorkflowStore()

  // Load workflows only when auth is ready - prevents empty results
  const hasLoadedRef = useRef(false)
  useEffect(() => {
    if (isLoaded && isSignedIn && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadWorkflows()
    }
  }, [isLoaded, isSignedIn, loadWorkflows])

  const refetch = () => loadWorkflows({ showLoading: true })

  const invokeWorkflow = useInvokeWorkflow()
  const deleteWorkflowMutation = useDeleteWorkflow({
    onError: (error: Error) => {
      setAlertDialog({
        open: true,
        title: "Failed to delete workflow",
        description: error.message || "An unknown error occurred while deleting the workflow.",
        variant: "error",
      })
    },
  })

  const handleRun = async (workflow: WorkflowWithVersions) => {
    if (!workflow.activeVersion) return

    const userInput = prompt("Enter input for the workflow:")
    if (!userInput) return

    setRunningWorkflows(prev => new Set(prev).add(workflow.wf_id))

    try {
      const result = await invokeWorkflow.mutateAsync({
        workflowVersionId: workflow.activeVersion.wf_version_id,
        evalInput: {
          type: "prompt-only",
          workflowId: workflow.wf_id,
          goal: userInput,
        },
      })

      if (result.success) {
        setAlertDialog({
          open: true,
          title: "Workflow completed successfully",
          description: `Output: ${JSON.stringify(result.data, null, 2)}\n\nCost: $${result.usdCost?.toFixed(4) || "0"}`,
          variant: "success",
        })
      } else {
        throw new Error(result.error || "Workflow execution failed")
      }
    } catch (error) {
      logException(error, {
        location: window.location.pathname,
      })
      console.error("Failed to run workflow:", error)
      setAlertDialog({
        open: true,
        title: "Failed to run workflow",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "error",
      })
    } finally {
      setRunningWorkflows(prev => {
        const next = new Set(prev)
        next.delete(workflow.wf_id)
        return next
      })
    }
  }

  const handleDelete = (workflowId: string) => {
    setConfirmDialog({
      open: true,
      workflowId,
    })
  }

  const confirmDelete = async () => {
    if (confirmDialog.workflowId) {
      await deleteWorkflowMutation.mutateAsync(confirmDialog.workflowId)
      // Optimistically remove from store
      removeWorkflow(confirmDialog.workflowId)
      setConfirmDialog({ open: false, workflowId: null })
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
            type="button"
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 p-2 text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          </button>
          <Link
            href="/edit"
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
      {!isLoaded || (isLoading && workflows.length === 0) ? (
        <div className="flex justify-center py-16">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">No workflows yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">Create your first workflow to get started</p>
          <Link
            href="/edit"
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

      {/* Mutation loading indicators */}
      {(invokeWorkflow.isPending || deleteWorkflowMutation.isPending) && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white px-4 py-2 rounded-md flex items-center gap-2">
          <div className="size-4 animate-spin rounded-full border border-current border-t-transparent" />
          {invokeWorkflow.isPending && "Running workflow..."}
          {deleteWorkflowMutation.isPending && "Deleting..."}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={open => setConfirmDialog(prev => ({ ...prev, open }))}
        title="Delete workflow"
        description="Are you sure you want to delete this workflow? This action cannot be undone."
        variant="error"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
      />

      {/* Alert Dialog */}
      <AlertDialog
        open={alertDialog.open}
        onOpenChange={open => setAlertDialog(prev => ({ ...prev, open }))}
        title={alertDialog.title}
        description={alertDialog.description}
        variant={alertDialog.variant}
      />
    </div>
  )
}
