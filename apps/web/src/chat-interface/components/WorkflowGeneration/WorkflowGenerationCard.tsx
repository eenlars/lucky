/**
 * WorkflowGenerationCard
 *
 * Shows the AI generating a workflow in real-time
 * Provides transparency and builds trust
 */

"use client"

import { cn } from "@/lib/utils"
import { Brain, CheckCircle2, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

interface WorkflowGenerationCardProps {
  status: "generating" | "running" | "complete" | "error"
  workflowName?: string
  nodeCount?: number
  currentNode?: string
  progress?: number
  className?: string
}

export function WorkflowGenerationCard({
  status,
  workflowName = "Untitled Workflow",
  nodeCount = 0,
  currentNode,
  progress = 0,
  className,
}: WorkflowGenerationCardProps) {
  const [dots, setDots] = useState(".")

  // Animated dots for loading states
  useEffect(() => {
    if (status === "generating" || status === "running") {
      const interval = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? "." : `${prev}.`))
      }, 500)
      return () => clearInterval(interval)
    }
  }, [status])

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br transition-all duration-500",
        status === "generating" && "border-blue-200 from-blue-50/50 to-blue-100/30",
        status === "running" && "border-purple-200 from-purple-50/50 to-purple-100/30",
        status === "complete" && "border-green-200 from-green-50/50 to-green-100/30",
        status === "error" && "border-red-200 from-red-50/50 to-red-100/30",
        className,
      )}
    >
      {/* Shimmer effect for active states */}
      {(status === "generating" || status === "running") && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      )}

      <div className="relative p-4 sm:p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
              status === "generating" && "bg-blue-100",
              status === "running" && "bg-purple-100",
              status === "complete" && "bg-green-100",
              status === "error" && "bg-red-100",
            )}
          >
            {status === "generating" && <Brain className="w-5 h-5 text-blue-600 animate-pulse" />}
            {status === "running" && <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />}
            {status === "complete" && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            {status === "error" && <Brain className="w-5 h-5 text-red-600" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Status text */}
            <div className="text-sm font-medium text-gray-900">
              {status === "generating" && `Designing workflow${dots}`}
              {status === "running" && `Running workflow${dots}`}
              {status === "complete" && "Workflow complete"}
              {status === "error" && "Workflow failed"}
            </div>

            {/* Workflow name */}
            {workflowName && (
              <div className="text-xs text-gray-600 truncate" title={workflowName}>
                {workflowName}
              </div>
            )}

            {/* Node count */}
            {nodeCount > 0 && (
              <div className="text-xs text-gray-500">
                {nodeCount} {nodeCount === 1 ? "step" : "steps"}
              </div>
            )}

            {/* Current node (when running) */}
            {status === "running" && currentNode && (
              <div className="text-xs font-medium text-purple-600 truncate">→ {currentNode}</div>
            )}

            {/* Progress bar */}
            {(status === "running" || status === "complete") && (
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500 ease-out",
                    status === "running" && "bg-purple-500",
                    status === "complete" && "bg-green-500",
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
