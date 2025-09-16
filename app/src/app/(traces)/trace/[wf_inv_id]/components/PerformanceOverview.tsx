"use client"

import { SmartContent } from "@/components/utils/SmartContent"
import type { Tables } from "@lucky/shared"
// Simple JSON extraction function
const extractJSON = (input: unknown): any => {
  if (typeof input === "object" && input !== null) {
    return input
  }
  if (typeof input !== "string") {
    return input
  }
  try {
    return JSON.parse(input)
  } catch {
    return input
  }
}
import { ChevronDown, ChevronRight, Files, FileText } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import remarkGfm from "remark-gfm"
import { ExpectedOutputDialog } from "./ExpectedOutputDialog"

interface WorkflowInvocationExtrasLegacy {
  evaluation?: unknown
  actualOutput?: unknown
}

interface PerformanceMetrics {
  totalDuration: number
  bottleneckNode: string | null
  totalNodes: number
  totalCost: number
}

interface PerformanceOverviewProps {
  workflow: Tables<"WorkflowInvocation">
  workflowVersion: Tables<"WorkflowVersion"> | null
  performanceMetrics: PerformanceMetrics
  wf_inv_id: string
}

export default function PerformanceOverview({
  workflow,
  workflowVersion,
  performanceMetrics,
  wf_inv_id: _wf_inv_id,
}: PerformanceOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isExpActExpanded, setIsExpActExpanded] = useState(true)

  const toDisplayString = (value: unknown): string => {
    if (typeof value === "string") return value
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

  const isLongContent = (value: unknown | undefined): boolean => {
    if (value == null) return false
    const text = toDisplayString(value)
    const lineCount = text.split("\n").length
    return text.length > 800 || lineCount > 20
  }

  const isMarkdownContent = (content: string): boolean => {
    const markdownPatterns = [
      /^#{1,6}\s+/m, // Headers
      /\*\*[^*]+\*\*/, // Bold
      /\*[^*]+\*/, // Italic
      /`[^`]+`/, // Inline code
      /```[\s\S]*?```/, // Code blocks
      /^\s*[-*+]\s+/m, // Unordered lists
      /^\s*\d+\.\s+/m, // Ordered lists
      /\[([^\]]+)\]\(([^)]+)\)/, // Links
      /^\s*>\s+/m, // Blockquotes
      /\|.*\|/, // Tables
    ]
    return markdownPatterns.some((pattern) => pattern.test(content))
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`
  }

  return (
    <section className="mb-3">
      {/* Single Flowing Instrument Bar */}
      <div className="ring-1 ring-gray-300 shadow-sm bg-white rounded-2xl p-3">
        <div className="flex items-center justify-between">
          {/* Left: Expand Control + Title */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-gray-800 hover:text-black transition-all duration-200 group min-w-0 cursor-pointer"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown
                  size={14}
                  className="text-gray-600 group-hover:text-gray-800"
                />
              ) : (
                <ChevronRight
                  size={14}
                  className="text-gray-600 group-hover:text-gray-800"
                />
              )}
            </div>
            <span className="font-semibold text-sm text-black tracking-tight">
              Performance
            </span>
          </button>

          {/* Center: Flowing Metrics */}
          <div className="flex items-center gap-6 mx-6 flex-1 justify-center">
            {/* Duration */}
            <div className="text-center">
              <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                Duration
              </div>
              <div className="text-sm font-bold text-black tabular-nums">
                {formatDuration(performanceMetrics.totalDuration)}
              </div>
            </div>

            {/* Status with color dot */}
            <div className="text-center">
              <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                Status
              </div>
              <div className="flex items-center justify-center gap-1">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    workflow.status === "completed"
                      ? "bg-green-500"
                      : workflow.status === "failed"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                  }`}
                />
                <span className="text-sm font-bold text-black capitalize">
                  {workflow.status}
                </span>
              </div>
            </div>

            {/* Nodes */}
            <div className="text-center">
              <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                Nodes
              </div>
              <div className="text-sm font-bold text-black tabular-nums">
                {performanceMetrics.totalNodes}
              </div>
            </div>

            {/* Operation */}
            {workflowVersion && (
              <div className="text-center">
                <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                  Op
                </div>
                <div className="text-sm font-bold text-blue-700 capitalize">
                  {workflowVersion.operation}
                </div>
              </div>
            )}

            {/* Fitness Score */}
            {workflow.fitness &&
              (() => {
                let fitness: any
                if (typeof workflow.fitness === "string") {
                  fitness = extractJSON(workflow.fitness)
                  // If extractJSON couldn't parse it (returns original string), show fallback
                  if (typeof fitness === "string" && fitness === workflow.fitness) {
                    return (
                      <div className="text-center">
                        <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                          Score
                        </div>
                        <div className="text-sm font-bold text-green-700">
                          {String(workflow.fitness)}
                        </div>
                      </div>
                    )
                  }
                } else if (typeof workflow.fitness === "object") {
                  fitness = workflow.fitness
                } else {
                  fitness = { score: workflow.fitness }
                }

                if (fitness.data && typeof fitness.data === "object") {
                  fitness = fitness.data
                }

                const metrics = []

                if (fitness.score !== undefined) {
                  metrics.push(
                    <div key="score" className="text-center">
                      <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                        Score
                      </div>
                      <div className="text-sm font-bold text-green-700 tabular-nums">
                        {Math.round(fitness.score)}/100
                      </div>
                    </div>
                  )
                }

                if (fitness.totalCostUsd !== undefined) {
                  metrics.push(
                    <div key="cost" className="text-center">
                      <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                        Cost
                      </div>
                      <div className="text-sm font-bold text-black tabular-nums">
                        ${fitness.totalCostUsd.toFixed(4)}
                      </div>
                    </div>
                  )
                }

                if (fitness.accuracy !== undefined) {
                  metrics.push(
                    <div key="accuracy" className="text-center">
                      <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                        Accuracy
                      </div>
                      <div className="text-sm font-bold text-blue-700 tabular-nums">
                        {Math.round(fitness.accuracy)}%
                      </div>
                    </div>
                  )
                }

                if (fitness.efficiency !== undefined) {
                  metrics.push(
                    <div key="efficiency" className="text-center">
                      <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                        Efficiency
                      </div>
                      <div className="text-sm font-bold text-orange-700 tabular-nums">
                        {Math.round(fitness.efficiency)}%
                      </div>
                    </div>
                  )
                }

                return metrics
              })()}
          </div>

          {/* Right: Structure Link */}
          <Link
            href={`/edit/${workflowVersion?.wf_version_id}?mode=json`}
            className="flex items-center gap-1 text-blue-700 hover:text-blue-800 transition-colors text-sm font-semibold"
          >
            <FileText size={12} />
            <span className="hidden sm:inline">Structure</span>
          </Link>
        </div>

        {/* Collapsible Details */}
        {isExpanded && (
          <div className="border-t border-gray-200 mt-3">
            {/* Workflow Goal */}
            <div className="p-4 border-b border-gray-200">
              <div className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-1">
                Workflow Goal
              </div>
              <div className="text-sm text-gray-900">
                {workflowVersion?.commit_message ?? "No goal"}
              </div>
            </div>

            {/* Configuration Files */}
            {workflow.metadata &&
              typeof workflow.metadata === "object" &&
              !Array.isArray(workflow.metadata) &&
              (workflow.metadata as any).configFiles &&
              Array.isArray((workflow.metadata as any).configFiles) &&
              (workflow.metadata as any).configFiles.length > 0 && (
                <div className="p-4 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Files size={16} />
                    Configuration Files
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {((workflow.metadata as any).configFiles as string[]).map(
                      (file: string, index: number) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs"
                        >
                          <FileText size={10} />
                          {file}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Input/Feedback/Output Display - Only in collapsible section */}
            {(workflow.workflow_input ||
              workflow.workflow_output ||
              workflow.feedback) && (
              <div className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  Workflow Input/Output
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="space-y-4">
                    {/* Workflow Input + Feedback side by side */}
                    {(workflow.workflow_input || workflow.feedback) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Input */}
                        {workflow.workflow_input && (
                          <div>
                            <div className="font-medium text-sm text-gray-900 mb-1">
                              Input
                            </div>
                            <div
                              className={`bg-white p-3 rounded border overflow-y-auto ${
                                isLongContent(workflow.workflow_input)
                                  ? "max-h-[65vh]"
                                  : "max-h-40"
                              }`}
                            >
                              <SmartContent
                                value={workflow.workflow_input}
                                collapsed={false}
                                enableClipboard
                                showExpanders
                                jsonTheme="auto"
                              />
                            </div>
                          </div>
                        )}
                        {/* Feedback */}
                        {workflow.feedback && (
                          <div>
                            <div className="font-medium text-sm text-gray-900 mb-1">
                              Feedback
                            </div>
                            <div
                              className={`bg-white p-3 rounded border overflow-y-auto ${
                                isLongContent(workflow.feedback)
                                  ? "max-h-[65vh]"
                                  : "max-h-40"
                              }`}
                            >
                              <div className="text-sm text-gray-900">
                                {isMarkdownContent(workflow.feedback) ? (
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeHighlight]}
                                    components={{
                                      pre: ({ children }) => (
                                        <pre className="bg-gray-100 rounded-lg p-3 overflow-x-auto text-xs">
                                          {children}
                                        </pre>
                                      ),
                                      code: ({ children, className }) => {
                                        const isInline = !className
                                        return isInline ? (
                                          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                                            {children}
                                          </code>
                                        ) : (
                                          <code className={className}>
                                            {children}
                                          </code>
                                        )
                                      },
                                      p: ({ children }) => (
                                        <p className="mb-2 last:mb-0">
                                          {children}
                                        </p>
                                      ),
                                    }}
                                  >
                                    {workflow.feedback}
                                  </ReactMarkdown>
                                ) : (
                                  workflow.feedback
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Workflow Output */}
                    {workflow.workflow_output && (
                      <div>
                        <div className="font-medium text-sm text-gray-900 mb-1">
                          Output:
                        </div>
                        <div className="text-xs text-gray-800 bg-white p-3 rounded border max-h-32 overflow-y-auto">
                          {typeof workflow.workflow_output === "object"
                            ? JSON.stringify(workflow.workflow_output, null, 2)
                            : String(workflow.workflow_output)}
                        </div>
                      </div>
                    )}

                    {/* Legacy workflow_io fallback */}
                    {!workflow.workflow_input &&
                      !workflow.workflow_output &&
                      workflow.workflow_io && (
                        <>
                          <div>
                            <div className="font-medium text-sm text-gray-900 mb-1">
                              Input (legacy):
                            </div>
                            <div className="text-xs text-gray-800 bg-white p-3 rounded border max-h-32 overflow-y-auto">
                              {(workflow.workflow_io as any)?.workflowInput ||
                                "No input"}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-sm text-gray-900 mb-1">
                              Output (legacy):
                            </div>
                            <div className="text-xs text-gray-800 bg-white p-3 rounded border max-h-32 overflow-y-auto">
                              {typeof (workflow.workflow_io as any)
                                ?.workflowOutput === "object"
                                ? JSON.stringify(
                                    (workflow.workflow_io as any)
                                      ?.workflowOutput,
                                    null,
                                    2
                                  )
                                : (workflow.workflow_io as any)
                                    ?.workflowOutput || "No output"}
                            </div>
                          </div>
                        </>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* Expected vs Actual Output (prefer new; fallback to legacy) */}
            {(() => {
              const extras =
                workflow.extras as unknown as WorkflowInvocationExtrasLegacy | null
              const expectedNew = workflow.expected_output ?? undefined
              const actualNew = workflow.actual_output ?? undefined
              const expectedLegacy =
                extras &&
                typeof extras === "object" &&
                "evaluation" in (extras as any)
                  ? (extras as any).evaluation
                  : undefined
              const actualLegacy =
                extras &&
                typeof extras === "object" &&
                "actualOutput" in (extras as any)
                  ? (extras as any).actualOutput
                  : undefined

              const expectedValue =
                typeof expectedNew === "string" && expectedNew.trim() !== ""
                  ? expectedNew
                  : expectedLegacy
              const actualValue =
                typeof actualNew === "string" && actualNew.trim() !== ""
                  ? actualNew
                  : actualLegacy

              if (expectedValue == null && actualValue == null) return null

              return (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">
                      Expected vs Actual Output
                    </h4>
                    <button
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      onClick={() => setIsExpActExpanded((v) => !v)}
                      aria-label={
                        isExpActExpanded ? "Collapse outputs" : "Expand outputs"
                      }
                      title={isExpActExpanded ? "Collapse" : "Expand"}
                    >
                      <ChevronDown
                        size={14}
                        className={`text-gray-600 transition-transform ${isExpActExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>
                  {isExpActExpanded && (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {expectedValue != null && expectedValue !== "" && (
                          <div>
                            <div className="font-medium text-sm text-gray-900 mb-1">
                              Expected Output
                            </div>
                            <div
                              className={`bg-white p-3 rounded border overflow-y-auto ${
                                isLongContent(expectedValue)
                                  ? "max-h-[65vh]"
                                  : "max-h-40"
                              }`}
                            >
                              <SmartContent
                                value={expectedValue}
                                collapsed={false}
                                enableClipboard
                                showExpanders
                                jsonTheme="auto"
                              />
                            </div>
                          </div>
                        )}
                        {actualValue != null && actualValue !== "" && (
                          <div>
                            <div className="font-medium text-sm text-gray-900 mb-1">
                              Actual Output
                            </div>
                            <div
                              className={`bg-white p-3 rounded border overflow-y-auto ${
                                isLongContent(actualValue)
                                  ? "max-h-[65vh]"
                                  : "max-h-40"
                              }`}
                            >
                              <SmartContent
                                value={actualValue}
                                collapsed={false}
                                enableClipboard
                                showExpanders
                                jsonTheme="auto"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Expected Output Type - Only in collapsible section */}
            {workflow.expected_output_type && (
              <div className="p-4 border-b border-gray-200">
                <ExpectedOutputDialog
                  expectedOutputType={workflow.expected_output_type}
                />
              </div>
            )}

            {/* Fitness Feedback - Only in collapsible section */}
            {workflow.fitness &&
              typeof workflow.fitness === "object" &&
              (workflow.fitness as any).feedback && (
                <div className="p-4 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Performance Feedback
                  </h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-900">
                      {(workflow.fitness as any).feedback}
                    </div>
                  </div>
                </div>
              )}

            {/* Workflow Feedback moved next to input above */}
          </div>
        )}
      </div>
    </section>
  )
}
