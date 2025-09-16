"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Play, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkflowItem {
  id: string
  name: string
  version?: number
  publishedAt?: Date
  triggerType: "Manual" | "API" | "Schedule"
}

function WorkflowRow({ 
  workflow, 
  onRun, 
  isRunning 
}: { 
  workflow: WorkflowItem
  onRun: (workflow: WorkflowItem) => void
  isRunning: boolean
}) {
  const hasPublishedVersion = workflow.version !== undefined
  const timeAgo = workflow.publishedAt ? formatTimeAgo(workflow.publishedAt) : null

  return (
    <div className="relative flex items-center gap-4 px-4 h-14 border-b border-border/30 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-all duration-[80ms] ease-out group">
      {/* Active/hover indicator */}
      <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-[80ms] ease-out" aria-hidden="true" />
      {/* Name */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/edit/${workflow.id}`}
          className="font-semibold text-[14px] leading-[20px] text-foreground hover:underline truncate block"
          title={workflow.name}
        >
          {workflow.name}
        </Link>
      </div>

      {/* Version + Time */}
      <div className="flex-shrink-0 text-[12px] text-muted-foreground min-w-[120px]">
        {hasPublishedVersion && timeAgo ? (
          <span title={`Last published: v${workflow.version} • ${workflow.publishedAt?.toISOString()}`}>
            v{workflow.version} • {timeAgo}
          </span>
        ) : (
          <span className="text-muted-foreground/60" title="No published version yet">
            —
          </span>
        )}
      </div>

      {/* Trigger */}
      <div className="flex-shrink-0">
        <span className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1 text-[12px] text-muted-foreground">
          {workflow.triggerType}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onRun(workflow)}
          disabled={!hasPublishedVersion || isRunning}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-all duration-[80ms] ease-out active:scale-[0.98]",
            "focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2",
            hasPublishedVersion && !isRunning
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
          title={!hasPublishedVersion ? "Publish before running" : undefined}
        >
          {isRunning ? (
            <>
              <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
              Running...
            </>
          ) : (
            <>
              <Play className="size-3" />
              {hasPublishedVersion ? `Run v${workflow.version}` : "Run"}
            </>
          )}
        </button>
        
        <Link
          href={`/edit/${workflow.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all duration-[80ms] ease-out active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2"
        >
          <Pencil className="size-3" />
          Edit
        </Link>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="text-lg font-semibold text-foreground mb-2">No workflows yet</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Create your first workflow. You can publish and run it any time.
      </p>
      <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-md hover:bg-primary/90 transition-all duration-[80ms] ease-out active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2">
        Create Workflow
      </button>
    </div>
  )
}

function LoadingState() {
  const skeletonWidths = [
    { name: "w-48", version: "w-16", actions1: "w-20", actions2: "w-12" }, // Customer Onboarding Flow
    { name: "w-40", version: "w-20", actions1: "w-24", actions2: "w-12" }, // Data Processing 
    { name: "w-52", version: "w-14", actions1: "w-16", actions2: "w-12" }, // Email Campaign Workflow
    { name: "w-36", version: "w-18", actions1: "w-20", actions2: "w-12" }, // API Integration
    { name: "w-44", version: "w-16", actions1: "w-20", actions2: "w-12" }  // Report Generator
  ]

  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, index) => {
        const widths = skeletonWidths[index]
        return (
          <div
            key={index}
            className="flex items-center gap-4 px-4 h-14 border-b border-border/30"
          >
            {/* Name skeleton */}
            <div className="flex-1 min-w-0">
              <div className={`h-4 bg-muted rounded animate-[pulse_1.2s_linear_infinite] ${widths.name}`} />
            </div>
            
            {/* Version/time skeleton */}
            <div className="flex-shrink-0 min-w-[120px]">
              <div className={`h-3 bg-muted rounded animate-[pulse_1.2s_linear_infinite] ${widths.version}`} />
            </div>
            
            {/* Trigger skeleton */}
            <div className="flex-shrink-0">
              <div className="h-6 bg-muted animate-[pulse_1.2s_linear_infinite] rounded-lg w-16" />
            </div>
            
            {/* Actions skeleton */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`h-7 bg-muted rounded animate-[pulse_1.2s_linear_infinite] ${widths.actions1}`} />
              <div className={`h-7 bg-muted rounded animate-[pulse_1.2s_linear_infinite] ${widths.actions2}`} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return "just now"
  if (diffInMinutes < 60) return `${diffInMinutes}m`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays <= 7) return `${diffInDays}d`
  
  return date.toLocaleDateString()
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [runningWorkflows, setRunningWorkflows] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Simulate loading
    const timeout = setTimeout(() => {
      // Mock data for demonstration
      setWorkflows([
        {
          id: "1",
          name: "Customer Onboarding Flow",
          version: 3,
          publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          triggerType: "Manual"
        },
        {
          id: "2", 
          name: "Data Processing Pipeline",
          version: 1,
          publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          triggerType: "Manual"
        },
        {
          id: "3",
          name: "Email Campaign Workflow",
          triggerType: "Manual"
        }
      ])
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timeout)
  }, [])

  const handleRun = async (workflow: WorkflowItem) => {
    if (workflow.version === undefined) return

    setRunningWorkflows(prev => new Set(prev).add(workflow.id))
    
    // Simulate API call
    setTimeout(() => {
      setRunningWorkflows(prev => {
        const next = new Set(prev)
        next.delete(workflow.id)
        return next
      })
      
      // Show success toast (would integrate with your toast system)
      console.log(`Run started (v${workflow.version}). View run →`)
    }, 2000)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] leading-[30px] font-semibold text-foreground">Workflows</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Last published versions run by default.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-md hover:bg-primary/90 transition-all duration-[80ms] ease-out active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2">
          Create Workflow
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState />
      ) : workflows.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {workflows.map((workflow) => (
            <WorkflowRow
              key={workflow.id}
              workflow={workflow}
              onRun={handleRun}
              isRunning={runningWorkflows.has(workflow.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}