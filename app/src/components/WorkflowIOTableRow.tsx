"use client"

import type { InvokeWorkflowResult } from "@core/workflow/runner/types"
import type { WorkflowIO } from "./WorkflowIOTable"
import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { useRunConfigStore } from "@/stores/run-config-store"

type Props = {
  io: WorkflowIO
  index: number
}

type ErrorResult = { error: string }

function isInvokeWorkflowResult(value: unknown): value is InvokeWorkflowResult {
  if (value === null || typeof value !== "object") return false
  const obj = value as Record<string, unknown>
  const qrr = obj["queueRunResult"] as Record<string, unknown> | undefined
  if (!qrr || typeof qrr !== "object") return false
  const finalOut = qrr["finalWorkflowOutput"]
  return typeof finalOut === "string"
}

function isErrorResult(value: unknown): value is ErrorResult {
  if (value === null || typeof value !== "object") return false
  const obj = value as Record<string, unknown>
  return typeof obj["error"] === "string"
}

// Expanded data structure with fake values
const EXPANDED_FIELDS = {
  // Execution metrics
  executionTime: "2.3s",
  tokenCount: 1847,
  totalCost: "$0.024",
  
  // Model info
  model: "claude-3-sonnet",
  temperature: 0.7,
  maxTokens: 4096,
  
  // Workflow metadata
  workflowVersion: "v2.1.0",
  nodeCount: 5,
  toolsUsed: ["search", "calculator", "code_interpreter"],
  
  // Quality metrics
  confidence: 0.92,
  reasoning: "Systematic approach with tool validation",
  warnings: ["Rate limit approaching", "High token usage"],
  
  // Debug info
  retryCount: 1,
  cacheHit: false,
  region: "us-east-1",
} as const

type PropsWithConfig = Props & {
  workflowConfig?: any // will be passed from parent
  onRun?: (io: WorkflowIO) => Promise<void>
}

export default function WorkflowIOTableRow({ io, index, workflowConfig, onRun }: PropsWithConfig) {
  const [edits, setEdits] = useState({ input: io.input, expected: io.expected })
  const [isExpanded, setIsExpanded] = useState(false)
  
  const {
    busyIds,
    resultsById,
    updateCase,
    removeCase,
    runOne,
    cancel,
  } = useRunConfigStore(
    useShallow((s) => ({
      busyIds: s.busyIds,
      resultsById: s.resultsById,
      updateCase: s.updateCase,
      removeCase: s.removeCase,
      runOne: s.runOne,
      cancel: s.cancel,
    }))
  )

  const busy = busyIds?.has(io.id)
  const res = resultsById[io.id]
  const canRun = Boolean(edits.input?.trim())

  const handleSave = async () => {
    const patch: Partial<WorkflowIO> = {}
    if (edits.input !== io.input) patch.input = edits.input
    if (edits.expected !== io.expected) patch.expected = edits.expected
    if (Object.keys(patch).length === 0) return
    await updateCase(io.id, patch)
  }

  const handleRun = async () => {
    if (!canRun) return
    if (onRun) {
      await onRun({ ...io, ...edits })
    } else if (workflowConfig) {
      await runOne(workflowConfig, { ...io, ...edits })
    }
  }

  return (
    <>
      <tr className={`border-b ${busy ? "bg-blue-50" : ""}`}>
        <td className="py-2 px-3 text-gray-500">{index + 1}</td>
        <td className="py-2 px-3">
          <textarea
            className="w-full border rounded p-1.5 text-xs font-mono resize-none focus:border-blue-500 focus:outline-none"
            rows={2}
            value={edits.input}
            onChange={(e) => setEdits({ ...edits, input: e.target.value })}
            onBlur={handleSave}
            disabled={busy}
          />
        </td>
        <td className="py-2 px-3">
          <textarea
            className="w-full border rounded p-1.5 text-xs font-mono resize-none focus:border-blue-500 focus:outline-none"
            rows={2}
            value={edits.expected}
            onChange={(e) => setEdits({ ...edits, expected: e.target.value })}
            onBlur={handleSave}
            disabled={busy}
          />
        </td>
        <td className="py-2 px-3">
          {(() => {
            const out = isInvokeWorkflowResult(res)
              ? res.queueRunResult.finalWorkflowOutput
              : undefined
            if (!out) {
              return <span className="text-gray-300">—</span>
            }
            return (
              <div className="max-h-16 overflow-auto text-xs font-mono bg-gray-50 rounded p-1.5">
                {out}
              </div>
            )
          })()}
        </td>
        <td className="py-2 px-3">
          {isErrorResult(res) ? (
            <span className="text-red-600 text-xs">Error</span>
          ) : isInvokeWorkflowResult(res) && res.fitness ? (
            <div>
              <span className="text-green-700 text-xs font-medium">
                {typeof res.fitness.accuracy === "number"
                  ? `${Math.round(
                      res.fitness.accuracy <= 1
                        ? res.fitness.accuracy * 100
                        : res.fitness.accuracy
                    )}%`
                  : "✓"}
              </span>
              {isInvokeWorkflowResult(res) && (
                <a
                  href={`/trace/${res.workflowInvocationId}`}
                  target="_blank"
                  className="ml-2 text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  trace
                </a>
              )}
            </div>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
        <td className="py-2 px-3">
          <div className="flex gap-1">
            <button
              className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                busy
                  ? "bg-gray-600 text-white"
                  : canRun
                  ? "bg-black text-white hover:bg-gray-800"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
              onClick={() => {
                if (busy) {
                  cancel(io.id)
                } else if (canRun) {
                  handleRun()
                }
              }}
              disabled={!canRun && !busy}
            >
              {busy ? "Stop" : "Run"}
            </button>
            <button
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? "−" : "+"}
            </button>
            <button
              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded cursor-pointer"
              onClick={() => removeCase(io.id)}
              disabled={busy}
            >
              ×
            </button>
          </div>
        </td>
      </tr>
      
      {/* Expanded row with additional fields */}
      {isExpanded && (
        <tr className="border-b bg-gray-50">
          <td colSpan={6} className="p-4">
            <div className="grid grid-cols-3 gap-4 text-xs">
              {/* Execution Metrics */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Execution Metrics</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Execution Time:</span>
                    <span className="font-mono">{EXPANDED_FIELDS.executionTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Token Count:</span>
                    <span className="font-mono">{EXPANDED_FIELDS.tokenCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Cost:</span>
                    <span className="font-mono text-green-600">{EXPANDED_FIELDS.totalCost}</span>
                  </div>
                </div>
              </div>

              {/* Model Configuration */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Model Configuration</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Model:</span>
                    <span className="font-mono">{EXPANDED_FIELDS.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Temperature:</span>
                    <span className="font-mono">{EXPANDED_FIELDS.temperature}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Max Tokens:</span>
                    <span className="font-mono">{EXPANDED_FIELDS.maxTokens}</span>
                  </div>
                </div>
              </div>

              {/* Workflow Info */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Workflow Details</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Version:</span>
                    <span className="font-mono">{EXPANDED_FIELDS.workflowVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Node Count:</span>
                    <span className="font-mono">{EXPANDED_FIELDS.nodeCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Retry Count:</span>
                    <span className="font-mono">{EXPANDED_FIELDS.retryCount}</span>
                  </div>
                </div>
              </div>

              {/* Tools Used */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Tools Used</h4>
                <div className="flex flex-wrap gap-1">
                  {EXPANDED_FIELDS.toolsUsed.map((tool) => (
                    <span
                      key={tool}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quality Assessment */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Quality Assessment</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Confidence:</span>
                    <span className="font-mono">{(EXPANDED_FIELDS.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Reasoning:</span>
                    <p className="text-gray-700 mt-1">{EXPANDED_FIELDS.reasoning}</p>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Warnings</h4>
                <div className="space-y-1">
                  {EXPANDED_FIELDS.warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <span className="text-orange-500">⚠</span>
                      <span className="text-gray-600">{warning}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Debug Info */}
              <div className="col-span-3 pt-2 border-t">
                <h4 className="font-semibold text-gray-700 mb-2">Debug Information</h4>
                <div className="flex gap-6 text-gray-500">
                  <span>Cache Hit: <span className="font-mono">{EXPANDED_FIELDS.cacheHit ? "Yes" : "No"}</span></span>
                  <span>Region: <span className="font-mono">{EXPANDED_FIELDS.region}</span></span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}