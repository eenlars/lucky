"use client"

import { Card } from "@/ui/card"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import { isNir } from "@lucky/shared/client"
import {
  AlertCircle,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Maximize2,
  Minimize2,
  Target,
  Terminal,
  Type,
  Wrench,
} from "lucide-react"
import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"

const ReactJson = dynamic(() => import("react-json-view"), { ssr: false })

// Helper function to get ReactJson theme based on current theme
const getReactJsonTheme = () => {
  if (typeof window !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "monokai"
  }
  return "rjv-default"
}

interface ToolCallsDisplayProps {
  agentSteps?: AgentSteps
  expandAll?: boolean | null
}

export const ToolCallsDisplay = ({ agentSteps, expandAll }: ToolCallsDisplayProps) => {
  const [expandedCalls, setExpandedCalls] = useState<Set<number>>(new Set())
  const [collapsedCalls, setCollapsedCalls] = useState<Set<number>>(() => {
    // Collapse reasoning, planning, and tool boxes by default, but keep terminate expanded
    const initialCollapsed = new Set<number>()
    agentSteps?.forEach((output, index) => {
      if (output.type === "reasoning" || output.type === "plan" || output.type === "tool") {
        initialCollapsed.add(index)
      }
    })
    return initialCollapsed
  })
  const [_showResultButton, _setShowResultButton] = useState<Record<number, boolean>>({})
  const resultRefs = useRef<Record<number, HTMLDivElement | null>>({})

  // Debug logging to see what agentSteps we receive
  console.log("[ToolCallsDisplay] Received agentSteps:", {
    hasToolUsage: !!agentSteps,
    toolUsageStructure: agentSteps
      ? {
          hasOutputs: !!agentSteps,
          outputsLength: agentSteps?.length || 0,
          outputsTypes: agentSteps?.map(o => o.type) || [],
          outputsNames: agentSteps?.map(o => o.name) || [],
          fullOutputs: agentSteps,
        }
      : null,
    rawToolUsage: agentSteps,
  })

  // Check if results need expand/collapse buttons
  useEffect(() => {
    const newShowButtons: Record<number, boolean> = {}
    Object.entries(resultRefs.current).forEach(([index, ref]) => {
      if (ref) {
        newShowButtons[Number(index)] = ref.scrollHeight > 160 // max-h-40 = 160px
      }
    })
    _setShowResultButton(newShowButtons)
  }, [agentSteps])

  // Handle expand/collapse all
  useEffect(() => {
    if (expandAll === null || !agentSteps) return

    if (expandAll) {
      // Expand all: clear collapsed set, expand all calls
      setCollapsedCalls(new Set())
      setExpandedCalls(new Set(agentSteps.map((_, index) => index)))
    } else {
      // Collapse all: set all to collapsed, clear expanded
      setCollapsedCalls(new Set(agentSteps.map((_, index) => index)))
      setExpandedCalls(new Set())
    }
  }, [expandAll, agentSteps])

  if (!agentSteps || agentSteps.length === 0) {
    return null
  }

  // Normalize legacy data format to new format
  const normalizedOutputs = agentSteps.map((output: any) => {
    if (output.type === "tool") {
      // Handle legacy format: toolArgs, toolName, toolResponse
      if ("toolArgs" in output || "toolName" in output || "toolResponse" in output) {
        return {
          type: "tool" as const,
          name: output.toolName || output.name || "",
          args: output.toolArgs || output.args || {},
          return: output.toolResponse || output.return || "",
        }
      }
    }
    return output
  })

  // Filter out empty outputs
  const relevantOutputs = normalizedOutputs.filter(output => {
    if (output.type === "learning" || output.type === "reasoning" || output.type === "text") {
      return output.return && String(output.return).trim().length > 0
    }
    if (output.type === "terminate") {
      return output.return && String(output.return).trim().length > 0
    }
    if (output.type === "tool") {
      return output.name && String(output.name).trim().length > 0
    }
    return true
  })

  if (relevantOutputs.length === 0) {
    return null
  }

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedCalls)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedCalls(newExpanded)
  }

  const toggleCollapsed = (index: number) => {
    const newCollapsed = new Set(collapsedCalls)
    if (newCollapsed.has(index)) {
      newCollapsed.delete(index)
    } else {
      newCollapsed.add(index)
    }
    setCollapsedCalls(newCollapsed)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatArgsSummary = (args: any): string => {
    if (!args || typeof args !== "object") return String(args || "{}")
    const keys = Object.keys(args)
    if (keys.length === 0) return "{}"
    if (keys.length === 1) {
      const key = keys[0]
      const value = args[key]
      if (typeof value === "string" && value.length < 30) {
        return `${key}: "${value}"`
      }
      return `${key}: ${typeof value}`
    }
    return `{${keys.length} keys: ${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "..." : ""}}`
  }

  const getResultSummary = (toolResponse: any): any => {
    if (!toolResponse || typeof toolResponse !== "object") return toolResponse
    // Extract just the result part, ignore metadata
    if (toolResponse.result !== undefined) {
      return toolResponse.result
    }
    return toolResponse
  }

  const getStepIcon = (type: string) => {
    switch (type) {
      case "reasoning":
        return <Brain className="w-4 h-4" />
      case "plan":
        return <Target className="w-4 h-4" />
      case "learning":
        return <BookOpen className="w-4 h-4" />
      case "terminate":
        return <Terminal className="w-4 h-4" />
      case "text":
        return <Type className="w-4 h-4" />
      case "error":
        return <AlertCircle className="w-4 h-4" />
      case "tool":
        return <Wrench className="w-4 h-4" />
      default:
        return null
    }
  }

  const getStepTheme = (type: string, isError?: boolean) => {
    if (isError) {
      return {
        cardClass:
          "bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 transition-colors",
        iconClass: "text-red-500 dark:text-red-400",
        labelClass: "text-red-700 dark:text-red-300 text-xs font-medium",
        contentClass: "text-gray-800 dark:text-gray-200",
      }
    }

    return {
      cardClass:
        "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors",
      iconClass: "text-gray-500 dark:text-gray-400",
      labelClass: "text-gray-700 dark:text-gray-300 text-xs font-medium",
      contentClass: "text-gray-800 dark:text-gray-200",
    }
  }

  return (
    <div className="space-y-3">
      {relevantOutputs.map((output, index) => {
        const isCollapsed = collapsedCalls.has(index)
        const theme = getStepTheme(
          output.type,
          output.type === "terminate" &&
            typeof output.return === "string" &&
            (output.return.toLowerCase().includes("error") ||
              output.return.toLowerCase().includes("failed") ||
              output.return.toLowerCase().includes("exception")),
        )

        // Helper function to get truncated content for collapsed state
        const getTruncatedContent = (content: string) => {
          if (typeof content !== "string") {
            content = JSON.stringify(content)
          }
          return content.length > 80 ? content.substring(0, 80) + "..." : content
        }

        // If collapsed, show minimal one-line version
        if (isCollapsed) {
          return (
            <Card
              key={`collapsed-${output.type}-${index}`}
              className={`p-2 shadow-sm cursor-pointer opacity-75 hover:opacity-90 transition-opacity ${theme.cardClass} ${output.type === "terminate" ? "border-l-4 border-l-blue-400" : ""}`}
              onClick={() => toggleCollapsed(index)}
            >
              <div className="flex items-center gap-2">
                <div className={`${theme.iconClass}`}>{getStepIcon(output.type)}</div>
                <div className={`text-xs truncate flex-1 ${theme.contentClass}`}>
                  {output.type === "terminate" ? "Final Result: " : ""}
                  {getTruncatedContent(output.return || "")}
                </div>
                <div className="flex items-center gap-1">
                  {output.type === "terminate" && <span className="text-[9px] text-blue-600 font-medium">RESULT</span>}
                  <ChevronDown size={12} className="text-slate-400 dark:text-slate-500" />
                </div>
              </div>
            </Card>
          )
        }

        if (output.type === "reasoning") {
          return (
            <Card
              key={`reasoning-${index}`}
              className={`p-2 shadow-sm cursor-pointer ${theme.cardClass}`}
              onClick={() => toggleCollapsed(index)}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`${theme.iconClass}`}>{getStepIcon(output.type)}</div>
                  <span className={`${theme.labelClass} text-xs`}>Reasoning</span>
                </div>
                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${theme.contentClass}`}>
                  {output.return}
                </div>
              </div>
            </Card>
          )
        }

        if (output.type === "plan") {
          return (
            <Card
              key={`plan-${index}`}
              className={`p-2 shadow-sm cursor-pointer ${theme.cardClass}`}
              onClick={() => toggleCollapsed(index)}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`${theme.iconClass}`}>{getStepIcon(output.type)}</div>
                  <span className={`${theme.labelClass} text-xs`}>Planning</span>
                </div>
                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${theme.contentClass}`}>
                  {output.return}
                </div>
              </div>
            </Card>
          )
        }

        if (output.type === "learning") {
          return (
            <Card
              key={`learning-${index}`}
              className={`p-2 shadow-sm cursor-pointer ${theme.cardClass}`}
              onClick={() => toggleCollapsed(index)}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`${theme.iconClass}`}>{getStepIcon(output.type)}</div>
                  <span className={`${theme.labelClass} text-xs`}>Learning</span>
                </div>
                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${theme.contentClass}`}>
                  {output.return}
                </div>
              </div>
            </Card>
          )
        }

        if (output.type === "terminate") {
          const isExpanded = expandedCalls.has(index)
          const returnData = output.return
          const hasSummary = !isNir(output.summary)

          const isError =
            typeof returnData === "string" &&
            (returnData.toLowerCase().includes("error") ||
              returnData.toLowerCase().includes("failed") ||
              returnData.toLowerCase().includes("exception"))

          const theme = getStepTheme(output.type, isError)

          return (
            <Card
              key={`terminate-${index}`}
              className={`p-2 shadow-sm ${isExpanded ? "" : "cursor-pointer"} ${theme.cardClass} border-l-4 border-l-blue-400`}
              onClick={
                isExpanded
                  ? undefined
                  : e => {
                      if (e.target === e.currentTarget || !(e.target as Element).closest("button")) {
                        toggleCollapsed(index)
                      }
                    }
              }
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`${theme.iconClass}`}>{getStepIcon(output.type)}</div>
                    <span className={`${theme.labelClass} text-xs`}>
                      {isError ? "Final Result (Error)" : "Final Result"}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-2">(click to view result)</span>
                    {!isError && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="p-1.5 rounded-full hover:bg-white/60 dark:hover:bg-gray-700/60 transition-colors duration-200"
                      onClick={e => {
                        e.stopPropagation()
                        copyToClipboard(
                          typeof returnData === "string" ? returnData : JSON.stringify(returnData, null, 2),
                        )
                      }}
                      title="Copy result"
                    >
                      <Copy size={14} className="text-slate-500 dark:text-slate-400" />
                    </button>
                    <button
                      className="p-1.5 rounded-full hover:bg-white/60 dark:hover:bg-gray-700/60 transition-colors duration-200 cursor-pointer"
                      onClick={e => {
                        e.stopPropagation()
                        toggleExpanded(index)
                      }}
                      title="Toggle details"
                    >
                      {isExpanded ? (
                        <ChevronUp size={14} className="text-slate-500 dark:text-slate-400" />
                      ) : (
                        <ChevronDown size={14} className="text-slate-500 dark:text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  {hasSummary && (
                    <div className={`text-sm ${theme.contentClass} bg-slate-50 dark:bg-slate-800 rounded-lg p-2 mb-2`}>
                      <span className="font-medium">Summary: </span>
                      <span>{output.summary}</span>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="space-y-2">
                      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-600 to-transparent"></div>
                      <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-2">
                        <div className={`text-sm font-medium mb-2 ${theme.contentClass}`}>Complete Result:</div>
                        <div
                          ref={el => {
                            resultRefs.current[index] = el
                          }}
                          className="overflow-hidden"
                        >
                          <ReactJson
                            src={typeof returnData === "string" ? { result: returnData } : returnData}
                            theme={getReactJsonTheme()}
                            collapsed={1}
                            displayObjectSize={false}
                            displayDataTypes={false}
                            enableClipboard={true}
                            style={{ fontSize: "12px" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {!isExpanded && (
                    <div className="mt-2">
                      <button
                        className="w-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 rounded-lg p-2 text-sm text-blue-700 dark:text-blue-300 font-medium transition-colors"
                        onClick={e => {
                          e.stopPropagation()
                          toggleExpanded(index)
                        }}
                      >
                        View Full Result
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        }

        if (output.type === "text") {
          const theme = getStepTheme(output.type)
          return (
            <Card
              key={`text-${index}`}
              className={`p-2 shadow-sm cursor-pointer ${theme.cardClass}`}
              onClick={() => toggleCollapsed(index)}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`${theme.iconClass}`}>{getStepIcon(output.type)}</div>
                  <span className={`${theme.labelClass} text-xs`}>Message</span>
                </div>
                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${theme.contentClass}`}>
                  {output.return}
                </div>
              </div>
            </Card>
          )
        }

        if (output.type === "error") {
          const theme = getStepTheme(output.type, true)
          return (
            <Card
              key={`error-${index}`}
              className={`p-3 shadow-sm cursor-pointer ${theme.cardClass}`}
              onClick={() => toggleCollapsed(index)}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${theme.iconClass}`}>{getStepIcon(output.type)}</div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${theme.labelClass}`}>
                      Error
                    </span>
                  </div>
                  <div className={`text-sm leading-relaxed whitespace-pre-wrap ${theme.contentClass}`}>
                    {output.return}
                  </div>
                </div>
              </div>
            </Card>
          )
        }

        if (output.type === "tool") {
          const isExpanded = expandedCalls.has(index)
          const hasResult = output.return !== undefined
          const hasSummary = !isNir(output.summary)
          const theme = getStepTheme(output.type)

          return (
            <Card
              key={`tool-${index}`}
              className={`p-2 shadow-sm ${isExpanded ? "" : "cursor-pointer"} ${theme.cardClass}`}
              onClick={
                isExpanded
                  ? undefined
                  : e => {
                      if (e.target === e.currentTarget || !(e.target as Element).closest("button")) {
                        toggleCollapsed(index)
                      }
                    }
              }
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`${theme.iconClass}`}>{getStepIcon(output.type)}</div>
                    <span className={`${theme.labelClass} text-xs`}>{output.name}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2">(click to view details)</span>
                    {hasResult && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="p-1.5 rounded-full hover:bg-white/60 dark:hover:bg-gray-700/60 transition-colors duration-200"
                      onClick={e => {
                        e.stopPropagation()
                        copyToClipboard(JSON.stringify(output.args, null, 2))
                      }}
                      title="Copy arguments"
                    >
                      <Copy size={14} className="text-slate-500 dark:text-slate-400" />
                    </button>
                    <button
                      className="p-1.5 rounded-full hover:bg-white/60 dark:hover:bg-gray-700/60 transition-colors duration-200 cursor-pointer"
                      onClick={e => {
                        e.stopPropagation()
                        toggleExpanded(index)
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
                    <span>{output.summary}</span>
                  </div>
                )}

                {!isExpanded && (
                  <div className="space-y-2">
                    {hasResult && (
                      <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-2">
                        <div className={`text-xs font-medium mb-1 ${theme.contentClass}`}>Result Preview:</div>
                        <code className="text-xs text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                          {JSON.stringify(getResultSummary(output.return)).substring(0, 100)}
                          {JSON.stringify(getResultSummary(output.return)).length > 100 ? "..." : ""}
                        </code>
                      </div>
                    )}
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-2">
                      <div className={`text-xs font-medium mb-1 ${theme.contentClass}`}>Arguments:</div>
                      <code className="text-xs text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        {formatArgsSummary(output.args)}
                      </code>
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="space-y-2">
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-600 to-transparent"></div>

                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-2">
                      <div className={`text-sm font-medium mb-2 ${theme.contentClass}`}>Arguments:</div>
                      <pre className="text-xs text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 p-2 rounded overflow-x-auto leading-relaxed">
                        {JSON.stringify(output.args, null, 2)}
                      </pre>
                    </div>

                    {hasResult && (
                      <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-2">
                        <div className={`text-sm font-medium mb-2 ${theme.contentClass}`}>Result:</div>
                        <div
                          ref={el => {
                            resultRefs.current[index] = el
                          }}
                          className="overflow-hidden"
                        >
                          <pre className="text-xs text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 p-2 rounded overflow-x-auto leading-relaxed">
                            {JSON.stringify(getResultSummary(output.return), null, 2)}
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

        // Fallback renderer for unknown step types (e.g., "prepare")
        const themeUnknown = getStepTheme(output.type)
        return (
          <Card
            key={`unknown-${index}`}
            className={`p-2 shadow-sm cursor-pointer ${themeUnknown.cardClass}`}
            onClick={() => toggleCollapsed(index)}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`${themeUnknown.iconClass}`}>{getStepIcon(output.type)}</div>
                <span className={`${themeUnknown.labelClass} text-xs`}>{output.type}</span>
              </div>
              {output.return && (
                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${themeUnknown.contentClass}`}>
                  {typeof output.return === "string" ? output.return : JSON.stringify(output.return, null, 2)}
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
