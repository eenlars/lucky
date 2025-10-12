/**
 * WorkflowResultCard
 *
 * Shows workflow execution results with actions
 * Key to converting explorers into builders
 */

"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight, BookmarkPlus, Copy, Download, Eye, Sparkles } from "lucide-react"
import { useState } from "react"

interface WorkflowResultCardProps {
  result: {
    output: string | Record<string, unknown>
    cost?: number
    duration?: number
    nodeCount?: number
  }
  workflowId?: string
  onShowWorkflow?: () => void
  onSaveWorkflow?: () => void
  onRunAgain?: () => void
  className?: string
}

export function WorkflowResultCard({
  result,
  workflowId: _workflowId,
  onShowWorkflow,
  onSaveWorkflow,
  onRunAgain,
  className,
}: WorkflowResultCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = typeof result.output === "string" ? result.output : JSON.stringify(result.output, null, 2)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
    }
  }

  const handleDownload = () => {
    const text = typeof result.output === "string" ? result.output : JSON.stringify(result.output, null, 2)
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "workflow-result.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  const isStringOutput = typeof result.output === "string"

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md",
        className,
      )}
    >
      {/* Header with metrics */}
      <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-900">Result</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            {result.duration && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                {result.duration < 1 ? "<1s" : `${Math.round(result.duration)}s`}
              </span>
            )}
            {result.cost !== undefined && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />$
                {result.cost < 0.01 ? "<0.01" : result.cost.toFixed(2)}
              </span>
            )}
            {result.nodeCount && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                {result.nodeCount} {result.nodeCount === 1 ? "step" : "steps"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Output content */}
      <div className="p-4 sm:p-5">
        {isStringOutput ? (
          <div className="text-sm text-gray-900 leading-relaxed">{result.output as string}</div>
        ) : (
          <pre className="font-mono text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto text-gray-900">
            {JSON.stringify(result.output, null, 2)}
          </pre>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 bg-gray-50/30 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary actions */}
          {onSaveWorkflow && (
            <Button
              size="sm"
              onClick={onSaveWorkflow}
              className="h-8 px-3 text-xs font-medium bg-black text-white hover:bg-black/90"
            >
              <BookmarkPlus className="w-3.5 h-3.5 mr-1.5" />
              Save workflow
            </Button>
          )}

          {onRunAgain && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRunAgain}
              className="h-8 px-3 text-xs font-medium border-gray-300 hover:bg-gray-100"
            >
              <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
              Run again
            </Button>
          )}

          {onShowWorkflow && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onShowWorkflow}
              className="h-8 px-3 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              Show workflow
            </Button>
          )}

          {/* Secondary actions */}
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100"
              title="Copy result"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownload}
              className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100"
              title="Download result"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {copied && (
          <div className="mt-2 text-xs text-green-600 animate-in fade-in slide-in-from-bottom-1 duration-200">
            ✓ Copied to clipboard
          </div>
        )}
      </div>
    </div>
  )
}
