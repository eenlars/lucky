"use client"

import type { Tables } from "@lucky/shared"
import { JSONN } from "@lucky/shared"
import { ChevronDown, ChevronRight, Files, FileText } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import remarkGfm from "remark-gfm"
import { ExpectedOutputDialog } from "./ExpectedOutputDialog"

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
  wf_inv_id,
}: PerformanceOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)

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

  const _renderFitnessMetrics = () => {
    if (!workflow.fitness) return null

    let fitness: any

    // Handle the case where fitness is a stringified JSON object
    if (typeof workflow.fitness === "string") {
      try {
        fitness = JSONN.extract(workflow.fitness)
      } catch {
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded border border-green-200 bg-green-50">
              <div className="flex flex-col">
                <span className="font-medium text-green-700 text-sm">
                  Performance Score
                </span>
                <span className="text-2xl font-bold text-green-600">
                  {String(workflow.fitness)}
                </span>
              </div>
            </div>
          </div>
        )
      }
    } else if (typeof workflow.fitness === "object") {
      fitness = workflow.fitness
    } else {
      fitness = { score: workflow.fitness }
    }

    // Check if it's the new wrapped format with "data" key
    if (fitness.data && typeof fitness.data === "object") {
      fitness = fitness.data
    }

    const isExtendedFitness =
      fitness.score !== undefined &&
      (fitness.totalCostUsd !== undefined ||
        fitness.totalTimeSeconds !== undefined ||
        fitness.accuracy !== undefined)

    if (isExtendedFitness) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded border border-green-200 bg-green-50">
            <div className="flex flex-col">
              <span className="font-medium text-green-700 text-sm">
                Performance Score
              </span>
              <span className="text-2xl font-bold text-green-600">
                {Math.round(fitness.score)}/100
              </span>
            </div>
          </div>

          {fitness.totalCostUsd !== undefined && (
            <div className="bg-white p-3 rounded border">
              <div className="flex flex-col">
                <span className="font-medium text-gray-600 text-sm">Cost</span>
                <span className="text-lg font-semibold">
                  ${fitness.totalCostUsd.toFixed(6)}
                </span>
              </div>
            </div>
          )}

          {fitness.totalTimeSeconds !== undefined && (
            <div className="bg-white p-3 rounded border">
              <div className="flex flex-col">
                <span className="font-medium text-gray-600 text-sm">
                  Duration
                </span>
                <span className="text-lg font-semibold">
                  {formatDuration(fitness.totalTimeSeconds)}
                </span>
              </div>
            </div>
          )}

          {fitness.accuracy !== undefined && (
            <div className="bg-white p-3 rounded border">
              <div className="flex flex-col">
                <span className="font-medium text-gray-600 text-sm">
                  Data Accuracy
                </span>
                <span className="text-lg font-semibold text-blue-600">
                  {Math.round(fitness.accuracy)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )
    } else {
      return (
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm">
            {Object.entries(fitness)
              .filter(([key]) => key !== "feedback")
              .map(([key, value]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-gray-600 capitalize">
                    {key.replace(/_/g, " ")}:
                  </span>
                  <span className="font-semibold text-gray-900">
                    {typeof value === "number"
                      ? Math.round(value)
                      : String(value)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )
    }
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
                  try {
                    fitness = JSONN.extract(workflow.fitness)
                  } catch {
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

            {/* Input/Output Display - Only in collapsible section */}
            {(workflow.workflow_input || workflow.workflow_output) && (
              <div className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  Workflow Input/Output
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="space-y-4">
                    {/* Workflow Input */}
                    {workflow.workflow_input && (
                      <div>
                        <div className="font-medium text-sm text-gray-900 mb-1">
                          Input:
                        </div>
                        <div className="text-xs text-gray-800 bg-white p-3 rounded border max-h-32 overflow-y-auto">
                          {typeof workflow.workflow_input === "object"
                            ? JSON.stringify(workflow.workflow_input, null, 2)
                            : String(workflow.workflow_input)}
                        </div>
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

            {/* Workflow Feedback - Only in collapsible section */}
            {workflow.feedback && (
              <div className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  Workflow Feedback
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg">
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
                              <code className={className}>{children}</code>
                            )
                          },
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          h1: ({ children }) => (
                            <h1 className="text-lg font-bold mb-2">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-base font-bold mb-2">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-sm font-bold mb-1">
                              {children}
                            </h3>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-4 mb-2">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-4 mb-2">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="mb-1">{children}</li>
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
      </div>
    </section>
  )
}
