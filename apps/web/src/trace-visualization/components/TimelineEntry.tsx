"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/react-flow-visualization/components/ui/dialog"
import type { NodeInvocationExtras } from "@/trace-visualization/db/Workflow/fullWorkflow"
import type { FullTraceEntry } from "@/trace-visualization/types"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip"
import { extractTextFromPayload } from "@lucky/core/messages/MessagePayload"
import type { AgentSteps, AgentStepsLegacy } from "@lucky/core/messages/pipeline/AgentStep.types"
import { isLegacyToolUsage, normalizeLegacyToolUsage } from "@lucky/core/messages/pipeline/LegacyToolUsage.types"
import { isNir } from "@lucky/shared/client"
import { TOOLS } from "@lucky/examples/settings/tools"
import { format } from "date-fns"
import { ChevronDown, Database, Maximize2, Minimize2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { AgentStepItem } from "./AgentStepItem"
import { filterRelevantSteps, generateStepKey } from "./agent-steps/utils"
import { STATUS_TO_COLOR, formatCost } from "./constants"

import { SmartContent } from "@/components/utils/SmartContent"

interface TimelineEntryProps {
  entry: FullTraceEntry
  index: number
  isLastNode?: boolean
}

export const getAgentSteps = (extras: NodeInvocationExtras | null): AgentSteps | undefined => {
  const agentSteps: AgentSteps | AgentStepsLegacy | undefined = extras?.agentSteps
  if (agentSteps && "totalCost" in agentSteps) {
    //legacy
    return agentSteps.outputs as unknown as AgentSteps
  }
  return agentSteps
}

function getLegacyAgentSteps(extras: unknown): { steps: AgentSteps; totalCost?: number } | null {
  if (!extras || typeof extras !== "object") return null
  const anyExtras = extras as Record<string, unknown>
  const toolUsage = anyExtras.toolUsage
  if (!isLegacyToolUsage(toolUsage)) return null
  return normalizeLegacyToolUsage(toolUsage)
}

export const TimelineEntry = ({ entry, index, isLastNode: _isLastNode = false }: TimelineEntryProps) => {
  const { invocation, nodeDefinition, inputs, output } = entry
  const router = useRouter()
  const [isPromptExpanded, setIsPromptExpanded] = useState(false)
  const [expandAllLogs, setExpandAllLogs] = useState<boolean | null>(null)
  const [isUpdatedMemoryExpanded, setIsUpdatedMemoryExpanded] = useState(false)
  const [expandedCalls, setExpandedCalls] = useState<Set<number>>(new Set())
  const [collapsedCalls, setCollapsedCalls] = useState<Set<number>>(new Set())
  const resultRefs = useRef<Record<number, HTMLDivElement | null>>({})
  // Effects are defined below after agentSteps is declared

  // Extract tool usage from invocation extras with proper typing
  const extras = invocation.extras as NodeInvocationExtras | null
  const agentSteps = getAgentSteps(extras)
  const legacySteps = getLegacyAgentSteps(extras as unknown)
  const updatedMemory = extras?.updatedMemory

  // Initialize collapsed state based on step types when steps load
  useEffect(() => {
    if (!agentSteps || expandAllLogs !== null) return
    const initial = new Set<number>()
    agentSteps.forEach((output, index) => {
      if (output.type === "reasoning" || output.type === "plan" || output.type === "tool") {
        initial.add(index)
      }
    })
    setCollapsedCalls(initial)
  }, [agentSteps, expandAllLogs])
  // Expand/collapse all handler
  useEffect(() => {
    if (expandAllLogs === null || !agentSteps) return
    if (expandAllLogs) {
      setCollapsedCalls(new Set())
      setExpandedCalls(new Set(agentSteps.map((_, idx) => idx)))
    } else {
      setCollapsedCalls(new Set(agentSteps.map((_, idx) => idx)))
      setExpandedCalls(new Set())
    }
  }, [expandAllLogs, agentSteps])

  const durationMs: number | null = invocation.end_time
    ? new Date(invocation.end_time).getTime() - new Date(invocation.start_time).getTime()
    : null

  const statusColor = STATUS_TO_COLOR[(invocation.status?.toLowerCase() as keyof typeof STATUS_TO_COLOR) ?? "default"]

  // extract a concise input summary if available
  const inputSummaryResult =
    inputs.length > 0
      ? extractInputSummary(inputs[0]?.payload)
      : { summary: "No input", original: null, isTruncated: false }
  const inputSummary = inputSummaryResult.summary

  // Minimal border accent
  const _statusBorder =
    invocation.status?.toLowerCase() === "success"
      ? "border-green-200"
      : invocation.status?.toLowerCase() === "running"
        ? "border-amber-200"
        : "border-gray-200"

  return (
    <div
      key={index}
      className={`
        relative flex flex-col h-full
        ring-1 ring-gray-300 dark:ring-gray-600 shadow-sm bg-white dark:bg-gray-800 rounded-2xl
        transition-shadow duration-200
      `}
    >
      {/* Clean status indicator */}
      <div className="absolute top-4 right-4">
        <div className={`w-2 h-2 rounded-full ${statusColor.replace("border", "bg")}`} />
      </div>

      {/* Node invocation header */}
      <div className="px-5 py-4 space-y-3">
        {/* Node ID and system prompt toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="text-xl font-bold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              onClick={() => router.push(`/node-invocation/${invocation.node_invocation_id}`)}
              title="View detailed node invocation"
            >
              {nodeDefinition?.node_id ?? invocation.node_id}
            </button>
            {nodeDefinition?.system_prompt && (
              <button
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                title="Toggle system prompt"
                aria-label="Toggle system prompt"
              >
                <ChevronDown
                  size={14}
                  className={`text-gray-500 dark:text-gray-400 transition-transform ${isPromptExpanded ? "rotate-180" : ""}`}
                />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <button
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  title="Inspect raw database content"
                  aria-label="Inspect raw database content"
                >
                  <Database size={14} />
                </button>
              </DialogTrigger>
              <DialogContent className="w-[90vw] max-w-none max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Raw Database Content</DialogTitle>
                  <DialogDescription>
                    Database records for node invocation: {nodeDefinition?.node_id ?? invocation.node_id}
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 space-y-4">
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Node Invocation</div>
                    <SmartContent value={invocation} collapsed={2} enableClipboard showExpanders jsonTheme="auto" />
                  </div>
                  {nodeDefinition && (
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Node Definition</div>
                      <SmartContent
                        value={nodeDefinition}
                        collapsed={2}
                        enableClipboard
                        showExpanders
                        jsonTheme="auto"
                      />
                    </div>
                  )}
                  {inputs.length > 0 && (
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Inputs</div>
                      <SmartContent value={inputs} collapsed={2} enableClipboard showExpanders jsonTheme="auto" />
                    </div>
                  )}
                  {output && (
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Output</div>
                      <SmartContent value={output} collapsed={2} enableClipboard showExpanders jsonTheme="auto" />
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            {durationMs != null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {(durationMs / 1000).toFixed(2)}s
                  </div>
                </TooltipTrigger>
                <TooltipContent>Invocation completed in {(durationMs / 1000).toFixed(2)} seconds</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Incoming message box */}
        {inputs.length > 0 && inputSummary && inputSummary !== "Input data object" && inputSummary !== "No input" && (
          <>
            {inputSummary.startsWith("Aggregated input from") ? (
              <Dialog>
                <DialogTrigger asChild>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                    <div className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">
                      Incoming message from previous node
                    </div>
                    <div className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed flex items-center justify-between">
                      <span>{inputSummary}</span>
                      <span className="text-xs text-blue-700 dark:text-blue-400 ml-2">(Click to view)</span>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Aggregated Inputs</DialogTitle>
                    <DialogDescription>{inputSummary}</DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 space-y-4">
                    {(() => {
                      const payload = inputs[0]?.payload
                      if (typeof payload === "object" && payload) {
                        const anyPayload: any = payload
                        const msgs = anyPayload.messages ?? anyPayload.berichten
                        if (Array.isArray(msgs)) {
                          return msgs.map((msg: any, idx: number) => (
                            <div
                              key={idx}
                              className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
                            >
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Input {idx + 1} {msg.from_node_id ? `from ${msg.from_node_id}` : ""}
                              </div>
                              <SmartContent value={msg} collapsed={2} enableClipboard showExpanders />
                            </div>
                          ))
                        }
                      }
                      return <div className="text-sm text-gray-500 dark:text-gray-400">No messages found</div>
                    })()}
                  </div>
                </DialogContent>
              </Dialog>
            ) : inputSummaryResult.isTruncated ? (
              <Dialog>
                <DialogTrigger asChild>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                    <div className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">
                      Incoming message from previous node
                    </div>
                    <div className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed flex items-center justify-between">
                      <span>{inputSummary}</span>
                      <span className="text-xs text-blue-700 dark:text-blue-400 ml-2">(Click to expand)</span>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Full Incoming Message</DialogTitle>
                    <DialogDescription>Complete message from previous node</DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                      <SmartContent
                        value={inputs[0]?.payload}
                        collapsed={false}
                        enableClipboard
                        showExpanders
                        stringifySpacing={2}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">
                  Incoming message from previous node
                </div>
                <div className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                  {(() => {
                    // Prefer canonical text extraction for preview; fall back to summary
                    try {
                      const text = extractTextFromPayload(inputs[0]?.payload as any)
                      if (text && typeof text === "string") {
                        return text.length > 300 ? text.substring(0, 300) + "..." : text
                      }
                    } catch {}
                    return inputSummary
                  })()}
                </div>
              </div>
            )}
          </>
        )}

        {/* Metadata footer bar */}
        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
          <span className="font-medium">Model: {invocation?.model ?? "N/A"}</span>
        </div>
      </div>

      {/* System prompt expansion */}
      {isPromptExpanded && nodeDefinition?.system_prompt && (
        <div className="px-4 pb-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-3 font-mono leading-relaxed border border-gray-200 dark:border-gray-600">
            {nodeDefinition.system_prompt}
          </div>
        </div>
      )}

      {/* Node memory display */}
      {((!isNir(nodeDefinition?.memory) && Object.keys(nodeDefinition.memory as Record<string, string>).length > 0) ||
        (!isNir(updatedMemory) && Object.keys(updatedMemory).length > 0)) && (
        <div className="px-4 pb-3">
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Memory</div>

            {/* Original/Initial Memory */}
            {!isNir(nodeDefinition?.memory) &&
              Object.keys(nodeDefinition.memory as Record<string, string>).length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2">Initial Memory</div>
                  <ul className="space-y-1">
                    {Object.entries(nodeDefinition.memory as Record<string, string>).map(([key, value], idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs">
                        <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                        <div className="flex-1">
                          <span className="font-medium text-amber-900 dark:text-amber-200">{key}:</span>{" "}
                          <span className="text-amber-800 dark:text-amber-300">{value}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Updated Memory */}
            {!isNir(updatedMemory) && Object.keys(updatedMemory).length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-green-700 dark:text-green-300">
                    Updated Memory (After Execution)
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                          onClick={() => setIsUpdatedMemoryExpanded(true)}
                          title="Expand updated memory"
                        >
                          <Maximize2 size={14} className="text-gray-600 dark:text-gray-400" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Expand updated memory</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                          onClick={() => setIsUpdatedMemoryExpanded(false)}
                          title="Collapse updated memory"
                        >
                          <Minimize2 size={14} className="text-gray-600 dark:text-gray-400" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Collapse updated memory</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                {isUpdatedMemoryExpanded && (
                  <ul className="space-y-1">
                    {Object.entries(updatedMemory).map(([key, value], idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs">
                        <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                        <div className="flex-1">
                          <span className="font-medium text-green-900 dark:text-green-200">{key}:</span>{" "}
                          <span className="text-green-800 dark:text-green-300">{value}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ultra-dense content */}
      <div className="px-4 pb-3 space-y-3">
        {/* Tools section with usage indicator and summaries */}
        {((nodeDefinition?.tools && nodeDefinition.tools.length > 0) ||
          agentSteps?.some(output => output.type === "tool")) && (
          <div className="space-y-2">
            {/* Tool usage badges */}
            <div className="flex flex-wrap gap-1">
              {(() => {
                // Get all unique tools (available + used)
                const availableTools = nodeDefinition?.tools || []
                const usedTools = agentSteps?.filter(output => output.type === "tool").map(output => output.name) || []
                const allTools = Array.from(new Set([...availableTools, ...usedTools]))

                return allTools.map((tool, index) => {
                  const wasUsed = usedTools.includes(tool)

                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <span
                          className={`
                            inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium cursor-help
                            ${
                              wasUsed
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
                            }
                          `}
                        >
                          {wasUsed && <div className="w-1 h-1 rounded-full bg-green-500 dark:bg-green-400" />}
                          {tool}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1">
                          <div className="text-xs font-medium">{wasUsed ? "✓ Used" : "Available"}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">{getToolDescription(tool)}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )
                })
              })()}
            </div>

            {/* Tool summaries - show quick overview of what tools accomplished */}
            {agentSteps
              ?.filter(output => output.type === "tool")
              .filter(toolOutput => "summary" in toolOutput && !isNir(toolOutput.summary))
              .map((toolOutput, index) => (
                <div
                  key={`tool-summary-${index}`}
                  className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-blue-500 dark:bg-blue-400 mt-2" />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">{toolOutput.name}</div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                        {"summary" in toolOutput ? toolOutput.summary : ""}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Tool execution details */}
        {agentSteps && agentSteps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-2 flex-1">
                Execution Steps ({agentSteps?.length || 0} )
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                      onClick={() => setExpandAllLogs(true)}
                      title="Expand all logs"
                    >
                      <Maximize2 size={14} className="text-gray-600 dark:text-gray-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Expand all logs</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                      onClick={() => setExpandAllLogs(false)}
                      title="Collapse all logs"
                    >
                      <Minimize2 size={14} className="text-gray-600 dark:text-gray-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Collapse all logs</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {filterRelevantSteps(agentSteps).map((output, i) => (
              <AgentStepItem
                key={generateStepKey("step", i, output as any)}
                index={i}
                step={output as any}
                isCollapsed={collapsedCalls.has(i)}
                isExpanded={expandedCalls.has(i)}
                onToggleCollapsed={() => {
                  const next = new Set(collapsedCalls)
                  if (next.has(i)) {
                    next.delete(i)
                  } else {
                    next.add(i)
                  }
                  setCollapsedCalls(next)
                }}
                onToggleExpanded={() => {
                  const next = new Set(expandedCalls)
                  if (next.has(i)) {
                    next.delete(i)
                  } else {
                    next.add(i)
                  }
                  setExpandedCalls(next)
                }}
                setResultRef={el => {
                  resultRefs.current[i] = el
                }}
              />
            ))}
          </div>
        )}

        {/* Legacy tool execution details (deprecated) */}
        {legacySteps && legacySteps.steps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-amber-700 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800 pb-2 flex-1">
                Legacy Execution Steps (deprecated)
              </div>
              <div className="flex items-center gap-2 ml-2">
                {typeof legacySteps.totalCost === "number" && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    cost: ${""}
                    {formatCost(legacySteps.totalCost)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  legacy
                </span>
              </div>
            </div>
            {filterRelevantSteps(legacySteps.steps).map((output, i) => (
              <AgentStepItem
                key={generateStepKey("legacy", i, output as any)}
                index={i}
                step={output as any}
                isCollapsed={collapsedCalls.has(i)}
                isExpanded={expandedCalls.has(i)}
                onToggleCollapsed={() => {
                  const next = new Set(collapsedCalls)
                  if (next.has(i)) {
                    next.delete(i)
                  } else {
                    next.add(i)
                  }
                  setCollapsedCalls(next)
                }}
                onToggleExpanded={() => {
                  const next = new Set(expandedCalls)
                  if (next.has(i)) {
                    next.delete(i)
                  } else {
                    next.add(i)
                  }
                  setExpandedCalls(next)
                }}
                setResultRef={el => {
                  resultRefs.current[i] = el
                }}
              />
            ))}
          </div>
        )}

        {/* Micro files */}
        {invocation.files && invocation.files.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {invocation.files.map((file, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700 rounded text-[9px] font-medium"
              >
                <div className="w-1 h-1 rounded-full bg-purple-400 dark:bg-purple-300" />
                {file.split("/").pop()}
              </span>
            ))}
          </div>
        )}

        {/* Compact footer inline */}
        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 font-mono pt-2 mt-2">
          <div className="flex items-center gap-2">
            <span>{formatCost(invocation.usd_cost)}</span>
            <span>•</span>
            <span>{format(new Date(invocation.start_time), "HH:mm:ss")}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// extract a concise summary from input payload
function extractInputSummary(payload: any): {
  summary: string
  original: string | null
  isTruncated: boolean
} {
  if (!payload) return { summary: "", original: null, isTruncated: false }

  // handle text payload
  if (typeof payload === "string") {
    if (payload.trim().length === 0) return { summary: "", original: null, isTruncated: false }
    // extract first sentence or first 60 chars
    const firstSentence = payload.split(/[.!?]/)
    if (firstSentence[0] && firstSentence[0].trim()) {
      const summary = firstSentence[0].length > 60 ? firstSentence[0].substring(0, 60) + "..." : firstSentence[0].trim()
      return {
        summary,
        original: payload,
        isTruncated: firstSentence[0].length > 60 || payload.length > firstSentence[0].length,
      }
    }
    const summary = payload.length > 60 ? payload.substring(0, 60) + "..." : payload
    return {
      summary,
      original: payload,
      isTruncated: payload.length > 60,
    }
  }

  // handle object payload
  if (typeof payload === "object") {
    // handle sequential payloads and non-English arrays
    if ((payload as any).kind === "sequential") {
      const anyPayload: any = payload
      const msgs = anyPayload.messages ?? anyPayload.berichten
      const messageCount = Array.isArray(msgs) ? msgs.length : 0
      if (messageCount > 0) {
        const first = msgs[0]
        const text: string | undefined =
          typeof first?.text === "string" ? first.text : typeof first?.message === "string" ? first.message : undefined
        if (text && text.trim()) {
          const original = text
          const summary = text.length > 80 ? text.substring(0, 80) + "..." : text
          return { summary, original, isTruncated: text.length > 80 }
        }
        return {
          summary: `Aggregated input from ${messageCount} message${messageCount !== 1 ? "s" : ""}`,
          original: JSON.stringify(payload, null, 2),
          isTruncated: false,
        }
      }
    }

    // handle specific payload kinds first (most specific)
    if (payload.kind === "aggregated" && payload.messages) {
      const messageCount = Array.isArray(payload.messages) ? payload.messages.length : 0
      return {
        summary: `Aggregated input from ${messageCount} node${messageCount !== 1 ? "s" : ""}`,
        original: JSON.stringify(payload, null, 2),
        isTruncated: false,
      }
    }

    // try to find a task or query field (only if not a specific kind)
    const extractField = (field: string) => {
      if (payload[field] && typeof payload[field] === "string" && payload[field].trim()) {
        const original = payload[field]
        const summary = original.length > 80 ? original.substring(0, 80) + "..." : original
        return {
          summary,
          original,
          isTruncated: original.length > 80,
        }
      }
      return null
    }

    // Check each field in priority order
    const fields = ["task", "query", "question", "message", "prompt", "text"]
    for (const field of fields) {
      if (!payload.kind || field === "task") {
        // only check task if not a specific kind
        const result = extractField(field)
        if (result) return result
      }
    }

    // fallback - don't show generic "object" message
    return { summary: "", original: null, isTruncated: false }
  }

  return { summary: "", original: null, isTruncated: false }
}

// get tool description from tools.ts
function getToolDescription(toolName: string): string {
  // check mcp tools first
  if (TOOLS.mcp[toolName as keyof typeof TOOLS.mcp]) {
    return TOOLS.mcp[toolName as keyof typeof TOOLS.mcp]
  }

  // check code tools
  if (TOOLS.code[toolName as keyof typeof TOOLS.code]) {
    return TOOLS.code[toolName as keyof typeof TOOLS.code]
  }

  return "No description available"
}
