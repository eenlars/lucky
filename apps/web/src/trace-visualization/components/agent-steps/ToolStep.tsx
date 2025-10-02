"use client"

import { Card } from "@/ui/card"
import { isNir } from "@lucky/shared/client"
import { CheckCircle2, Copy, Maximize2, Minimize2 } from "lucide-react"
import { formatArgsSummary, getResultSummary, getStepIcon, getStepTheme } from "./utils"

interface ToolStepProps {
  index: number
  name: string
  args: unknown
  result?: unknown
  summary?: string
  isExpanded: boolean
  isCollapsed: boolean
  onToggleCollapsed: () => void
  onToggleExpanded: () => void
  setResultRef?: (el: HTMLDivElement | null) => void
}

export const ToolStep = ({
  index,
  name,
  args,
  result,
  summary,
  isExpanded,
  isCollapsed,
  onToggleCollapsed,
  onToggleExpanded,
  setResultRef,
}: ToolStepProps) => {
  const hasResult = result !== undefined
  const hasSummary = !isNir(summary)
  const theme = getStepTheme("tool")

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (isCollapsed) {
    const preview = hasResult
      ? JSON.stringify(getResultSummary(result)).substring(0, 80) +
        (JSON.stringify(getResultSummary(result)).length > 80 ? "..." : "")
      : `args: ${formatArgsSummary(args)}`
    return (
      <Card
        key={`collapsed-tool-${index}`}
        className={`p-2 shadow-sm cursor-pointer opacity-75 hover:opacity-90 transition-opacity ${theme.cardClass}`}
        onClick={onToggleCollapsed}
      >
        <div className="flex items-center gap-2">
          <div className={`${theme.iconClass}`}>{getStepIcon("tool")}</div>
          <div className={`text-xs truncate flex-1 ${theme.contentClass}`}>
            {name}: {preview}
          </div>
          <div className="flex items-center gap-1">
            <Maximize2 size={12} className="text-slate-400 dark:text-slate-500" />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card
      key={`tool-${index}`}
      className={`p-2 shadow-sm ${isExpanded ? "" : "cursor-pointer"} ${theme.cardClass}`}
      onClick={
        isExpanded
          ? undefined
          : e => {
              if (e.target === e.currentTarget || !(e.target as Element).closest("button")) {
                onToggleCollapsed()
              }
            }
      }
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`${theme.iconClass}`}>{getStepIcon("tool")}</div>
            <span className={`${theme.labelClass} text-xs`}>{name}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2">(click to view details)</span>
            {hasResult && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-1.5 rounded-full hover:bg-white/60 dark:hover:bg-gray-700/60 transition-colors duration-200"
              onClick={e => {
                e.stopPropagation()
                copyToClipboard(JSON.stringify(args, null, 2))
              }}
              title="Copy arguments"
            >
              <Copy size={14} className="text-slate-500 dark:text-slate-400" />
            </button>
            <button
              className="p-1.5 rounded-full hover:bg-white/60 dark:hover:bg-gray-700/60 transition-colors duration-200 cursor-pointer"
              onClick={e => {
                e.stopPropagation()
                onToggleExpanded()
              }}
              title="Toggle details"
            >
              {isExpanded ? (
                <Minimize2 size={14} className="text-slate-500 dark:text-slate-400" />
              ) : (
                <Maximize2 size={14} className="text-slate-500 dark:text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {hasSummary && (
          <div className={`text-sm ${theme.contentClass} bg-slate-50 dark:bg-slate-800 rounded-lg p-2 mb-2`}>
            <span className="font-medium">Summary: </span>
            <span>{summary}</span>
          </div>
        )}

        {!isExpanded && (
          <div className="space-y-2">
            {hasResult && (
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-2">
                <div className={`text-xs font-medium mb-1 ${theme.contentClass}`}>Result Preview:</div>
                <code className="text-xs text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                  {JSON.stringify(getResultSummary(result)).substring(0, 100)}
                  {JSON.stringify(getResultSummary(result)).length > 100 ? "..." : ""}
                </code>
              </div>
            )}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-2">
              <div className={`text-xs font-medium mb-1 ${theme.contentClass}`}>Arguments:</div>
              <code className="text-xs text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                {formatArgsSummary(args)}
              </code>
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="space-y-2">
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-600 to-transparent" />

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-2">
              <div className={`text-sm font-medium mb-2 ${theme.contentClass}`}>Arguments:</div>
              <pre className="text-xs text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 p-2 rounded overflow-x-auto leading-relaxed">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>

            {hasResult && (
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-2">
                <div className={`text-sm font-medium mb-2 ${theme.contentClass}`}>Result:</div>
                <div ref={setResultRef ?? undefined} className="overflow-hidden">
                  <pre className="text-xs text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 p-2 rounded overflow-x-auto leading-relaxed">
                    {JSON.stringify(getResultSummary(result), null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
