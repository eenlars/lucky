"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/react-flow-visualization/components/ui/dialog"
import { PayloadRender } from "@/trace-visualization/components/InputRender"
import { getAgentSteps } from "@/trace-visualization/components/TimelineEntry"
import type { NodeInvocationExtras } from "@/trace-visualization/db/Workflow/fullWorkflow"
import type { FullTraceEntry } from "@/trace-visualization/types"
import { extractTextFromPayload } from "@lucky/core/messages/MessagePayload"
import type { AgentSteps } from "@lucky/core/messages/pipeline/AgentStep.types"
import { TOOLS } from "@lucky/examples/settings/tools"
import { isNir } from "@lucky/shared/client"
import { format } from "date-fns"
import { ChevronDown, Database, Eye } from "lucide-react"
import dynamic from "next/dynamic"
import { useState } from "react"
import { STATUS_TO_COLOR, formatCost } from "./constants"

const ReactJson = dynamic(() => import("react-json-view"), { ssr: false })

const getReactJsonTheme = () => {
  if (typeof window !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "monokai"
  }
  return "rjv-default"
}

interface NodeInvocationProps {
  entry: FullTraceEntry
}

export const NodeInvocation = ({ entry }: NodeInvocationProps) => {
  const { invocation, nodeDefinition, inputs, output } = entry
  const [isPromptExpanded, setIsPromptExpanded] = useState(true)
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [rightPanelMode, setRightPanelMode] = useState<"tools" | "json">("tools")
  const [expandedReasoningSteps, setExpandedReasoningSteps] = useState<Set<number>>(new Set())

  const extras = invocation.extras as NodeInvocationExtras | null
  const agentSteps: AgentSteps | undefined = getAgentSteps(extras)
  const updatedMemory = extras?.updatedMemory

  const durationMs: number | null = invocation.end_time
    ? new Date(invocation.end_time).getTime() - new Date(invocation.start_time).getTime()
    : null

  const statusColor = STATUS_TO_COLOR[(invocation.status?.toLowerCase() as keyof typeof STATUS_TO_COLOR) ?? "default"]

  const inputSummaryResult =
    inputs.length > 0
      ? extractInputSummary(inputs[0]?.payload)
      : { summary: "No input", original: null, isTruncated: false }

  const allToolOutputs = agentSteps?.filter(output => output.type === "tool") || []
  const availableTools = nodeDefinition?.tools || []
  const usedTools = allToolOutputs.map(output => output.name) || []
  const allTools = Array.from(new Set([...availableTools, ...usedTools]))

  const handleToolClick = (toolName: string) => {
    const toolOutput = allToolOutputs.find(t => t.name === toolName)
    if (toolOutput) {
      setSelectedTool(toolName)
      setRightPanelMode("json")
    }
  }

  const toggleReasoningStep = (index: number) => {
    const newExpanded = new Set(expandedReasoningSteps)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedReasoningSteps(newExpanded)
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left 1/3 - Node Details */}
      <div className="w-1/3 border-r border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Node Invocation</h1>
            <div className={`w-3 h-3 rounded-full ${statusColor.replace("border", "bg")}`} />
          </div>
          <div className="text-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded border dark:border-gray-600">
            {nodeDefinition?.node_id ?? invocation.node_id}
          </div>
        </div>

        {/* Node Settings */}
        <div className="p-6 space-y-6">
          {/* Model */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Model</h3>
            <div className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded border dark:border-gray-600">
              {invocation?.model ?? "N/A"}
            </div>
          </div>

          {/* System Prompt */}
          {nodeDefinition?.system_prompt && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">System Prompt</h3>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                  title="Toggle system prompt"
                >
                  <ChevronDown
                    size={16}
                    className={`text-gray-500 dark:text-gray-400 transition-transform ${isPromptExpanded ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
              {isPromptExpanded ? (
                <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-3 font-mono leading-relaxed border border-gray-200 dark:border-gray-600 max-h-60 overflow-y-auto">
                  {nodeDefinition.system_prompt}
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded border dark:border-gray-600">
                  {nodeDefinition.system_prompt.substring(0, 100)}...
                </div>
              )}
            </div>
          )}

          {/* Tools */}
          {allTools.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Tools</h3>
              <div className="flex flex-wrap gap-1">
                {allTools.map((tool, index) => {
                  const wasUsed = usedTools.includes(tool)
                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <span
                          className={`
                            inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium cursor-help
                            ${
                              wasUsed
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
                            }
                          `}
                        >
                          {wasUsed && <div className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />}
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
                })}
              </div>
            </div>
          )}

          {/* Memory */}
          {((!isNir(nodeDefinition?.memory) &&
            Object.keys(nodeDefinition.memory as Record<string, string>).length > 0) ||
            (!isNir(updatedMemory) && Object.keys(updatedMemory).length > 0)) && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Memory</h3>
              <div className="space-y-2">
                {!isNir(nodeDefinition?.memory) &&
                  Object.keys(nodeDefinition.memory as Record<string, string>).length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <div className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2">Initial</div>
                      <ul className="space-y-1">
                        {Object.entries(nodeDefinition.memory as Record<string, string>).map(([key, value], idx) => (
                          <li key={idx} className="text-xs">
                            <span className="font-medium text-amber-900 dark:text-amber-200">{key}:</span>{" "}
                            <span className="text-amber-800 dark:text-amber-300">{value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                {!isNir(updatedMemory) && Object.keys(updatedMemory).length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">Updated</div>
                    <ul className="space-y-1">
                      {Object.entries(updatedMemory).map(([key, value], idx) => (
                        <li key={idx} className="text-xs">
                          <span className="font-medium text-green-900 dark:text-green-200">{key}:</span>{" "}
                          <span className="text-green-800 dark:text-green-300">{value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
              <span>{formatCost(invocation.usd_cost)}</span>
              <span>•</span>
              <span>{format(new Date(invocation.start_time), "HH:mm:ss")}</span>
              {durationMs != null && (
                <>
                  <span>•</span>
                  <span>{(durationMs / 1000).toFixed(2)}s</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Left - Messages */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Messages</h3>

          {/* Incoming Message */}
          {inputs.length > 0 && inputSummaryResult.summary && inputSummaryResult.summary !== "No input" && (
            <div>
              <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Incoming {inputs.length > 1 && `(${inputs.length} messages)`}
              </h4>
              {inputSummaryResult.isTruncated ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-3 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors shadow-sm">
                      <div className="text-xs text-blue-700 dark:text-blue-300 mb-1">
                        From: {inputs[0]?.from_node_id || "Initial"}
                      </div>
                      <div className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed flex items-center justify-between">
                        <span>{inputSummaryResult.summary}</span>
                        <Eye size={14} className="text-blue-700 dark:text-blue-400 ml-2" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Full Incoming Message</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        From Node: {inputs[0]?.from_node_id || "Initial"}
                      </div>
                      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                        <PayloadRender
                          payload={inputs[0]?.payload}
                          msgId={`incoming-${inputs[0]?.msg_id}`}
                          inspectable
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-3 shadow-sm">
                  <div className="text-xs text-blue-700 dark:text-blue-300 mb-1">
                    From: {inputs[0]?.from_node_id || "Initial"}
                  </div>
                  <div className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed whitespace-pre-wrap">
                    {(() => {
                      try {
                        const text = extractTextFromPayload(inputs[0]?.payload as any)
                        if (text) {
                          return text.length > 300 ? `${text.substring(0, 300)}...` : text
                        }
                      } catch {}
                      return inputSummaryResult.summary
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Outgoing Message */}
          {output && (
            <div>
              <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Outgoing</h4>
              {(() => {
                const outputSummaryResult = extractInputSummary(output.payload)
                return outputSummaryResult.isTruncated ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                        <div className="text-sm text-green-900 dark:text-green-200 leading-relaxed flex items-center justify-between">
                          <span>{outputSummaryResult.summary}</span>
                          <Eye size={14} className="text-green-700 dark:text-green-400 ml-2" />
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Full Outgoing Message</DialogTitle>
                      </DialogHeader>
                      <div className="mt-4">
                        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                          <PayloadRender payload={output.payload} msgId={`outgoing-${output.msg_id}`} inspectable />
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <div className="text-sm text-green-900 dark:text-green-200 leading-relaxed">
                      {outputSummaryResult.summary || "No output content"}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Middle 1/3 - Messages Overview */}
      <div className="w-1/3 border-r border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Execution Steps ({agentSteps?.length || 0})
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Show incoming messages prominently */}
          {inputs.length > 0 && (
            <div className="border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 mb-6 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Incoming Message{inputs.length > 1 ? "s" : ""} ({inputs.length})
                </span>
                <span className="text-xs text-blue-700 dark:text-blue-300">
                  from {inputs[0]?.from_node_id || "Initial"}
                </span>
              </div>

              {/* Show primary message */}
              {inputSummaryResult.summary && inputSummaryResult.summary !== "No input" ? (
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  {inputSummaryResult.isTruncated ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 p-2 -m-2 rounded transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <span className="flex-1">{inputSummaryResult.summary}</span>
                            <Eye size={14} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          </div>
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Full Incoming Message</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            From Node: {inputs[0]?.from_node_id || "Initial"}
                          </div>
                          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
                            {inputSummaryResult.original || inputSummaryResult.summary}
                          </pre>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <div className="whitespace-pre-wrap">{inputSummaryResult.summary}</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-blue-600 dark:text-blue-400 italic">No message content</div>
              )}

              {/* Show if there are additional messages */}
              {inputs.length > 1 && (
                <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button type="button" className="text-xs text-blue-700 dark:text-blue-300 hover:underline">
                        View all {inputs.length} messages
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>All Incoming Messages</DialogTitle>
                      </DialogHeader>
                      <div className="mt-4 space-y-4">
                        {inputs.map((input, idx) => {
                          const _summary = extractInputSummary(input.payload)
                          return (
                            <div key={idx} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Message {idx + 1} from {input.from_node_id || "Initial"}
                              </div>
                              <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-x-auto">
                                {typeof input.payload === "string"
                                  ? input.payload
                                  : JSON.stringify(input.payload, null, 2)}
                              </pre>
                            </div>
                          )
                        })}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          )}

          {agentSteps?.map((step, index) => {
            const getStepIcon = (type: string) => {
              switch (type) {
                case "tool":
                  return "🔧"
                default:
                  return null
              }
            }

            const getStepColor = (type: string) => {
              switch (type) {
                case "plan":
                  return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                case "learning":
                  return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                case "terminate":
                  return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                case "error":
                  return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                case "tool":
                  return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                default:
                  return "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600"
              }
            }

            return (
              <div
                key={index}
                className={`${step.type === "reasoning" ? "py-2" : `border rounded-lg p-4 ${getStepColor(step.type)}`}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStepIcon(step.type) && <span className="text-lg">{getStepIcon(step.type)}</span>}
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Step {index + 1} - {step.type}
                    </span>
                    {step.type === "tool" && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                        {step.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {step.type === "reasoning" && (
                      <button
                        type="button"
                        onClick={() => toggleReasoningStep(index)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title={expandedReasoningSteps.has(index) ? "Collapse reasoning" : "Expand reasoning"}
                      >
                        <ChevronDown
                          size={14}
                          className={`text-gray-500 dark:text-gray-400 transition-transform ${expandedReasoningSteps.has(index) ? "rotate-180" : ""}`}
                        />
                      </button>
                    )}
                    {step.type === "tool" && (
                      <button
                        type="button"
                        onClick={() => handleToolClick(step.name)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Inspect tool call"
                      >
                        <Eye size={14} className="text-gray-500 dark:text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {(step.type === "text" ||
                    step.type === "reasoning" ||
                    step.type === "learning" ||
                    step.type === "plan") && (
                    <div
                      className={`whitespace-pre-wrap ${step.type === "reasoning" ? "italic text-gray-600 dark:text-gray-400" : ""}`}
                    >
                      {(() => {
                        const content = step.return
                        if (isNir(content)) {
                          return <span className="text-gray-500 dark:text-gray-400 italic">No content</span>
                        }
                        const stringContent = typeof content === "string" ? content : JSON.stringify(content)

                        // Special handling for reasoning steps
                        if (step.type === "reasoning") {
                          const isExpanded = expandedReasoningSteps.has(index)
                          const shouldTruncate = stringContent.length > 100

                          if (shouldTruncate && !isExpanded) {
                            return `${stringContent.substring(0, 100)}...`
                          }
                          return stringContent
                        }

                        // Other step types - keep original logic
                        return stringContent.length > 200 ? `${stringContent.substring(0, 200)}...` : stringContent
                      })()}
                    </div>
                  )}
                  {step.type === "terminate" && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Terminal output available in JSON viewer
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTool(`terminate-${index}`)
                          setRightPanelMode("json")
                        }}
                        className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View Details
                      </button>
                    </div>
                  )}
                  {step.type === "error" && (
                    <div className="text-red-700 dark:text-red-300 font-medium">
                      {typeof step.return === "string" ? step.return : JSON.stringify(step.return)}
                    </div>
                  )}
                  {step.type === "tool" && (
                    <div>
                      {"summary" in step && step.summary && (
                        <div className="text-blue-700 dark:text-blue-300 mb-2">{step.summary}</div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        Click inspect button to view full tool output
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {(!agentSteps || agentSteps.length === 0) && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">No execution steps recorded</div>
          )}
        </div>
      </div>

      {/* Right 1/3 - Tools or JSON */}
      <div className="w-1/3 bg-white dark:bg-gray-800 overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {rightPanelMode === "tools" ? "Tools" : "Tool Details"}
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRightPanelMode("tools")}
                className={`px-3 py-1 rounded text-sm ${rightPanelMode === "tools" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300" : "text-gray-600 dark:text-gray-400"}`}
              >
                Tools
              </button>
              <button
                type="button"
                onClick={() => setRightPanelMode("json")}
                disabled={!selectedTool}
                className={`px-3 py-1 rounded text-sm ${rightPanelMode === "json" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300" : "text-gray-600 dark:text-gray-400"} ${!selectedTool ? "opacity-50" : ""}`}
              >
                JSON
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {rightPanelMode === "tools" ? (
            <div className="space-y-4">
              {allTools.map((tool, index) => {
                const wasUsed = usedTools.includes(tool)
                const toolUsageCount = allToolOutputs.filter(output => output.name === tool).length

                return (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">{tool}</h4>
                        {wasUsed && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
                            Used {toolUsageCount}x
                          </span>
                        )}
                        {!wasUsed && (
                          <span className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                            Available
                          </span>
                        )}
                      </div>
                      {wasUsed && (
                        <button
                          type="button"
                          onClick={() => handleToolClick(tool)}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title="View usage details"
                        >
                          <Database size={14} className="text-gray-500 dark:text-gray-400" />
                        </button>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{getToolDescription(tool)}</div>

                    {wasUsed && (
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        Click database icon to inspect usage details
                      </div>
                    )}
                  </div>
                )
              })}

              {allTools.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No tools available for this node
                </div>
              )}
            </div>
          ) : (
            <div>
              {selectedTool ? (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    {selectedTool.startsWith("terminate-") ? "Terminal Output" : selectedTool}
                  </h4>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                    <ReactJson
                      src={(() => {
                        if (selectedTool.startsWith("terminate-")) {
                          const stepIndex = Number.parseInt(selectedTool.replace("terminate-", ""))
                          const terminateStep = agentSteps?.[stepIndex]
                          return terminateStep || {}
                        }
                        return allToolOutputs.find(t => t.name === selectedTool) || {}
                      })()}
                      theme={getReactJsonTheme()}
                      collapsed={1}
                      displayObjectSize={false}
                      displayDataTypes={false}
                      enableClipboard={true}
                      style={{ fontSize: "12px" }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Select a tool or step to view its details
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function extractInputSummary(payload: any): {
  summary: string
  original: string | null
  isTruncated: boolean
} {
  if (!payload) return { summary: "", original: null, isTruncated: false }

  if (typeof payload === "string") {
    if (payload.trim().length === 0) return { summary: "", original: null, isTruncated: false }
    const firstSentence = payload.split(/[.!?]/)
    if (firstSentence[0]?.trim()) {
      const summary = firstSentence[0].length > 60 ? `${firstSentence[0].substring(0, 60)}...` : firstSentence[0].trim()
      return {
        summary,
        original: payload,
        isTruncated: firstSentence[0].length > 60 || payload.length > firstSentence[0].length,
      }
    }
    const summary = payload.length > 60 ? `${payload.substring(0, 60)}...` : payload
    return {
      summary,
      original: payload,
      isTruncated: payload.length > 60,
    }
  }

  if (typeof payload === "object") {
    if ((payload as any).kind === "sequential") {
      const anyPayload: any = payload
      const msgs = anyPayload.messages ?? anyPayload.berichten
      const count = Array.isArray(msgs) ? msgs.length : 0
      if (Array.isArray(msgs) && count > 0) {
        const first = msgs[0]
        const text: string | undefined =
          typeof first?.text === "string" ? first.text : typeof first?.message === "string" ? first.message : undefined
        if (text && text.trim().length > 0) {
          const original = text
          const _summary = text.length > 80 ? `${text.substring(0, 80)}...` : text
          return { summary: _summary, original, isTruncated: text.length > 80 }
        }
        return {
          summary: `Aggregated input from ${count} message${count !== 1 ? "s" : ""}`,
          original: JSON.stringify(payload, null, 2),
          isTruncated: false,
        }
      }
    }
    if (payload.kind === "aggregated" && payload.messages) {
      const messageCount = Array.isArray(payload.messages) ? payload.messages.length : 0
      return {
        summary: `Aggregated input from ${messageCount} node${messageCount !== 1 ? "s" : ""}`,
        original: JSON.stringify(payload, null, 2),
        isTruncated: false,
      }
    }

    const extractField = (field: string) => {
      if (payload[field] && typeof payload[field] === "string" && payload[field].trim()) {
        const original = payload[field]
        const summary = original.length > 80 ? `${original.substring(0, 80)}...` : original
        return {
          summary,
          original,
          isTruncated: original.length > 80,
        }
      }
      return null
    }

    const fields = ["task", "query", "question", "message", "prompt", "text"]
    for (const field of fields) {
      if (!payload.kind || field === "task") {
        const result = extractField(field)
        if (result) return result
      }
    }

    return { summary: "", original: null, isTruncated: false }
  }

  return { summary: "", original: null, isTruncated: false }
}

function getToolDescription(toolName: string): string {
  if (TOOLS.mcp[toolName as keyof typeof TOOLS.mcp]) {
    return TOOLS.mcp[toolName as keyof typeof TOOLS.mcp]
  }

  if (TOOLS.code[toolName as keyof typeof TOOLS.code]) {
    return TOOLS.code[toolName as keyof typeof TOOLS.code]
  }

  return "No description available"
}
