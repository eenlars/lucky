"use client"

import { SmartContent } from "@/components/utils/SmartContent"
import type { Tables } from "@lucky/shared/client"
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
import { ChevronDown, ChevronRight, FileText, Files } from "lucide-react"
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
    return markdownPatterns.some(pattern => pattern.test(content))
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`
  }

  // Extract fitness metrics
  const fitness = workflow.fitness && typeof workflow.fitness === "object" ? (workflow.fitness as any) : null
  const hasFitnessMetrics = fitness && (fitness.score != null || fitness.accuracy != null)

  return (
    <section className="mb-6">
      {/* Performance Overview Card */}
      <div className="ring-1 ring-sidebar-border dark:ring-sidebar-border shadow-sm bg-sidebar-background dark:bg-sidebar-background rounded-xl p-5 transition-all duration-200">
        <div className="flex items-center justify-between">
          {/* Left: Critical Status at a Glance */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  workflow.status === "completed"
                    ? "bg-green-500 shadow-green-500/50 shadow-lg"
                    : workflow.status === "failed"
                      ? "bg-red-500 shadow-red-500/50 shadow-lg"
                      : "bg-yellow-500 shadow-yellow-500/50 shadow-lg animate-pulse"
                }`}
              />
              <span className="text-lg font-medium text-sidebar-foreground dark:text-sidebar-foreground capitalize">
                {workflow.status}
              </span>
            </div>
            {performanceMetrics.totalCost > 0 && (
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-sidebar-muted dark:text-sidebar-muted font-medium">$</span>
                <span className="text-lg font-medium text-sidebar-foreground dark:text-sidebar-foreground tabular-nums">
                  {performanceMetrics.totalCost.toFixed(4)}
                </span>
              </div>
            )}
            {/* Fitness Metrics */}
            {hasFitnessMetrics && (
              <>
                {fitness.score != null && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-sidebar-muted dark:text-sidebar-muted font-medium">Score:</span>
                    <span className="text-lg font-medium text-sidebar-foreground dark:text-sidebar-foreground tabular-nums">
                      {fitness.score.toFixed(2)}
                    </span>
                  </div>
                )}
                {fitness.accuracy != null && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-sidebar-muted dark:text-sidebar-muted font-medium">Accuracy:</span>
                    <span className="text-lg font-medium text-sidebar-foreground dark:text-sidebar-foreground tabular-nums">
                      {fitness.accuracy}%
                    </span>
                  </div>
                )}
              </>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sidebar-foreground/70 dark:text-sidebar-foreground/70 hover:text-sidebar-primary dark:hover:text-sidebar-primary transition-colors duration-200 text-sm font-medium px-3 py-1.5 hover:bg-sidebar-accent dark:hover:bg-sidebar-accent rounded-lg"
            >
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ease-out ${isExpanded ? "rotate-0" : "-rotate-90"}`}
              />
              <span>{isExpanded ? "Less" : "Details"}</span>
            </button>
          </div>

          {/* Center: Secondary Metrics - Only when expanded */}
          {isExpanded && (
            <div className="flex items-center gap-6 mx-6">
              <div className="text-sm text-sidebar-foreground/70 dark:text-sidebar-foreground/70">
                <span className="font-medium">{formatDuration(performanceMetrics.totalDuration)}</span>
              </div>
              <div className="text-sm text-sidebar-foreground/70 dark:text-sidebar-foreground/70">
                <span className="font-medium">{performanceMetrics.totalNodes} nodes</span>
              </div>
              {workflowVersion && (
                <div>
                  <span className="px-2.5 py-1 bg-sidebar-accent dark:bg-sidebar-accent text-sidebar-primary dark:text-sidebar-primary rounded-lg capitalize font-medium text-sm">
                    {workflowVersion.operation}
                  </span>
                </div>
              )}
              {/* Additional Fitness Metrics when expanded */}
              {fitness?.totalCostUsd != null && fitness.totalCostUsd !== performanceMetrics.totalCost && (
                <div className="text-sm text-sidebar-foreground/70 dark:text-sidebar-foreground/70">
                  <span className="font-medium">Fitness Cost: ${fitness.totalCostUsd.toFixed(4)}</span>
                </div>
              )}
              {fitness?.totalTimeSeconds != null && (
                <div className="text-sm text-sidebar-foreground/70 dark:text-sidebar-foreground/70">
                  <span className="font-medium">Fitness Time: {formatDuration(fitness.totalTimeSeconds)}</span>
                </div>
              )}
            </div>
          )}

          {/* Right: Edit Link */}
          <Link
            href={`/edit/${workflowVersion?.wf_version_id}?mode=json`}
            className="flex items-center gap-2 text-sidebar-primary dark:text-sidebar-primary hover:text-sidebar-primary/80 dark:hover:text-sidebar-primary/80 transition-colors duration-200 text-sm font-medium px-3 py-1.5 hover:bg-sidebar-accent dark:hover:bg-sidebar-accent rounded-lg"
          >
            <FileText size={14} />
            <span className="hidden sm:inline">Edit</span>
          </Link>
        </div>

        {/* Collapsible Details */}
        {isExpanded && (
          <div className="border-t border-sidebar-border dark:border-sidebar-border mt-5 pt-5 space-y-4 transition-all duration-300 ease-out">
            {/* Workflow Goal */}
            <div>
              <div className="text-xs font-medium text-sidebar-muted dark:text-sidebar-muted uppercase tracking-wide mb-2">
                Workflow Goal
              </div>
              <div className="text-sm text-sidebar-foreground dark:text-sidebar-foreground leading-relaxed">
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
                    {((workflow.metadata as any).configFiles as string[]).map((file: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs"
                      >
                        <FileText size={10} />
                        {file}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Input/Feedback/Output Display - Only in collapsible section */}
            {(workflow.workflow_input || workflow.workflow_output || workflow.feedback) && (
              <div className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">Workflow Input/Output</h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="space-y-4">
                    {/* Workflow Input + Feedback side by side */}
                    {(workflow.workflow_input || workflow.feedback) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Input */}
                        {workflow.workflow_input && (
                          <div>
                            <div className="font-medium text-sm text-gray-900 mb-1">Input</div>
                            <div
                              className={`bg-white p-3 rounded border overflow-y-auto ${
                                isLongContent(workflow.workflow_input) ? "max-h-[65vh]" : "max-h-40"
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
                            <div className="font-medium text-sm text-gray-900 mb-1">Feedback</div>
                            <div
                              className={`bg-white p-3 rounded border overflow-y-auto ${
                                isLongContent(workflow.feedback) ? "max-h-[65vh]" : "max-h-40"
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
                                          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{children}</code>
                                        ) : (
                                          <code className={className}>{children}</code>
                                        )
                                      },
                                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
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
                        <div className="font-medium text-sm text-gray-900 mb-1">Output:</div>
                        <div className="text-xs text-gray-800 bg-white p-3 rounded border max-h-32 overflow-y-auto">
                          {typeof workflow.workflow_output === "object"
                            ? JSON.stringify(workflow.workflow_output, null, 2)
                            : String(workflow.workflow_output)}
                        </div>
                      </div>
                    )}

                    {/* Legacy workflow_io fallback */}
                    {!workflow.workflow_input && !workflow.workflow_output && workflow.workflow_io && (
                      <>
                        <div>
                          <div className="font-medium text-sm text-gray-900 mb-1">Input (legacy):</div>
                          <div className="text-xs text-gray-800 bg-white p-3 rounded border max-h-32 overflow-y-auto">
                            {(workflow.workflow_io as any)?.workflowInput || "No input"}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900 mb-1">Output (legacy):</div>
                          <div className="text-xs text-gray-800 bg-white p-3 rounded border max-h-32 overflow-y-auto">
                            {typeof (workflow.workflow_io as any)?.workflowOutput === "object"
                              ? JSON.stringify((workflow.workflow_io as any)?.workflowOutput, null, 2)
                              : (workflow.workflow_io as any)?.workflowOutput || "No output"}
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
              const extras = workflow.extras as unknown as WorkflowInvocationExtrasLegacy | null
              const expectedNew = workflow.expected_output ?? undefined
              const actualNew = workflow.actual_output ?? undefined
              const expectedLegacy =
                extras && typeof extras === "object" && "evaluation" in (extras as any)
                  ? (extras as any).evaluation
                  : undefined
              const actualLegacy =
                extras && typeof extras === "object" && "actualOutput" in (extras as any)
                  ? (extras as any).actualOutput
                  : undefined

              const expectedValue =
                typeof expectedNew === "string" && expectedNew.trim() !== "" ? expectedNew : expectedLegacy
              const actualValue = typeof actualNew === "string" && actualNew.trim() !== "" ? actualNew : actualLegacy

              if (expectedValue == null && actualValue == null) return null

              return (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Expected vs Actual Output</h4>
                    <button
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      onClick={() => setIsExpActExpanded(v => !v)}
                      aria-label={isExpActExpanded ? "Collapse outputs" : "Expand outputs"}
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
                            <div className="font-medium text-sm text-gray-900 mb-1">Expected Output</div>
                            <div
                              className={`bg-white p-3 rounded border overflow-y-auto ${
                                isLongContent(expectedValue) ? "max-h-[65vh]" : "max-h-40"
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
                            <div className="font-medium text-sm text-gray-900 mb-1">Actual Output</div>
                            <div
                              className={`bg-white p-3 rounded border overflow-y-auto ${
                                isLongContent(actualValue) ? "max-h-[65vh]" : "max-h-40"
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
                <ExpectedOutputDialog expectedOutputType={workflow.expected_output_type} />
              </div>
            )}

            {/* Fitness Feedback - Only in collapsible section */}
            {workflow.fitness && typeof workflow.fitness === "object" && (workflow.fitness as any).feedback && (
              <div className="p-4 border-b border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Performance Feedback</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-900">{(workflow.fitness as any).feedback}</div>
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
