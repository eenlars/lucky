"use client"

import { AlertCircle, AlertTriangle, CheckCircle, ChevronDown, Circle, Code, Copy } from "lucide-react"
import { useState } from "react"
import type { LogEntry as LogEntryType } from "../types"

const LOG_TYPE_CONFIG = {
  INFO: {
    color: "text-gray-500",
    icon: Circle,
    label: "INFO",
  },
  SUCCESS: {
    color: "text-emerald-500",
    icon: CheckCircle,
    label: "SUCCESS",
  },
  WARNING: {
    color: "text-amber-500",
    icon: AlertTriangle,
    label: "WARNING",
  },
  ERROR: {
    color: "text-red-500",
    icon: AlertCircle,
    label: "ERROR",
  },
  DEBUG: {
    color: "text-blue-500",
    icon: Code,
    label: "DEBUG",
  },
} as const

function formatTimestamp(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")
  const ms = date.getMilliseconds().toString().padStart(3, "0")
  return `${hours}:${minutes}:${seconds}.${ms}`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`
}

export function LogEntry({ log }: { log: LogEntryType }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showCopyFeedback, setShowCopyFeedback] = useState(false)
  const config = LOG_TYPE_CONFIG[log.type]
  const Icon = config.icon

  const hasExpandableContent = !!(
    log.input ||
    log.output ||
    log.model ||
    log.stackTrace ||
    log.duration != null ||
    log.tokens != null ||
    log.cost != null
  )

  const handleCopy = async () => {
    const logData = {
      timestamp: log.timestamp.toISOString(),
      node: log.nodeName,
      type: log.type,
      message: log.message,
      ...(log.input && { input: log.input }),
      ...(log.output && { output: log.output }),
      ...(log.model && { model: log.model }),
      ...(log.duration && { duration_ms: log.duration }),
      ...(log.tokens && { tokens: log.tokens }),
      ...(log.cost && { cost_usd: log.cost }),
      ...(log.stackTrace && { stack_trace: log.stackTrace }),
    }

    await navigator.clipboard.writeText(JSON.stringify(logData, null, 2))
    setShowCopyFeedback(true)
    setTimeout(() => setShowCopyFeedback(false), 2000)
  }

  return (
    <div className={`transition-colors ${isExpanded ? "bg-gray-100 dark:bg-white/5" : ""}`}>
      <div
        className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
        onClick={() => hasExpandableContent && setIsExpanded(!isExpanded)}
      >
        {/* Chevron (only if expandable) */}
        {hasExpandableContent && (
          <ChevronDown
            className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        )}
        {!hasExpandableContent && <div className="w-4 h-4 flex-shrink-0" />}

        {/* Timestamp */}
        <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 w-[14ch] flex-shrink-0">
          {formatTimestamp(log.timestamp)}
        </span>

        {/* Node Badge */}
        <span
          className="text-sm font-medium px-2 py-0.5 rounded border flex-shrink-0 max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap"
          style={{
            backgroundColor: log.nodeColor ? `${log.nodeColor}1A` : "rgb(243 244 246)",
            borderColor: log.nodeColor ? `${log.nodeColor}4D` : "rgb(229 231 235)",
            color: log.nodeColor || "rgb(17 24 39)",
          }}
        >
          {log.nodeName}
        </span>

        {/* Log Type */}
        <span
          className={`text-[11px] font-medium uppercase w-[7ch] flex-shrink-0 flex items-center gap-1 ${config.color}`}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="sr-only">{config.label}</span>
        </span>

        {/* Message */}
        <p className="flex-1 text-sm text-gray-900 dark:text-gray-100 leading-[1.5] line-clamp-3 break-words">
          {log.message}
        </p>
      </div>

      {/* Expanded Content */}
      {isExpanded && hasExpandableContent && (
        <div className="pl-[52px] pr-4 pb-3 relative group">
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-2 right-6 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Copy log entry as JSON"
          >
            <Copy className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Copy Feedback */}
          {showCopyFeedback && (
            <div className="absolute top-2 right-16 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded">
              Copied!
            </div>
          )}

          <div className="space-y-2">
            {/* Input */}
            {log.input && (
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">Input</label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-[oklch(0.13_0_0)] border border-gray-200 dark:border-white/10 rounded-md text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">
                  {log.input}
                </div>
              </div>
            )}

            {/* Output */}
            {log.output && (
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">Output</label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-[oklch(0.13_0_0)] border border-gray-200 dark:border-white/10 rounded-md text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">
                  {log.output}
                </div>
              </div>
            )}

            {/* Metadata */}
            {(log.model || log.duration != null || log.tokens != null || log.cost != null) && (
              <div className="text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                {log.model && <span>Model: {log.model}</span>}
                {log.duration != null && <span>Duration: {formatDuration(log.duration)}</span>}
                {log.tokens && (
                  <span>
                    Tokens: {log.tokens.total}
                    {log.tokens.prompt != null &&
                      log.tokens.completion != null &&
                      ` (prompt: ${log.tokens.prompt}, completion: ${log.tokens.completion})`}
                  </span>
                )}
                {log.cost != null && <span>Cost: {formatCost(log.cost)}</span>}
              </div>
            )}

            {/* Stack Trace (errors) */}
            {log.stackTrace && (
              <div>
                <label className="text-[11px] font-semibold uppercase text-red-500">Stack Trace</label>
                <div className="mt-1 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 rounded-md text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto">
                  {log.stackTrace}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
