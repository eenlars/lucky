"use client"

import { SmartContent } from "@/components/utils/SmartContent"
import { useRunConfigStore } from "@/stores/run-config-store"
import { useEffect, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import FeedbackDialog from "./FeedbackDialog"
import type { WorkflowIO } from "./WorkflowIOTable"
import { useMetrics } from "./hooks/useMetrics"
import { useRubricManagement } from "./hooks/useRubricManagement"
import { isErrorResult, isInvokeWorkflowResult } from "./utils/result-utils"
import {
  calculateRubricScores,
  parseWorkflowResultToMetrics,
} from "./utils/workflow-integration"

type Props = {
  io: WorkflowIO
  index: number
}

type PropsWithConfig = Props & {
  workflowConfig?: any
  onRun?: (io: WorkflowIO) => Promise<void>
}

export default function WorkflowIOTableRow({
  io,
  workflowConfig,
  onRun,
}: PropsWithConfig) {
  const [task, setTask] = useState(io.input)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const { busyIds, resultsById, updateCase, removeCase, runOne } =
    useRunConfigStore(
      useShallow((s) => ({
        busyIds: s.busyIds,
        resultsById: s.resultsById,
        updateCase: s.updateCase,
        removeCase: s.removeCase,
        runOne: s.runOne,
      }))
    )

  // Use custom hooks
  const rubric = useRubricManagement(io.id, io.expected, (id, expected) =>
    updateCase(id, { expected })
  )
  const metricsHook = useMetrics()
  const { setMetrics } = metricsHook
  const { setCriteria } = rubric

  const busy = busyIds?.has(io.id)
  const res = resultsById[io.id]
  const canRun = Boolean(task?.trim() && task.length >= 10)

  // Determine row state
  const isTaskEditable = !res && !busy // Task only editable before first run
  const isRubricEditable = !busy // Rubric always editable except during run

  // Update metrics and rubric scores when workflow results come in
  useEffect(() => {
    if (!res) return

    if (isInvokeWorkflowResult(res)) {
      const metrics = parseWorkflowResultToMetrics(res)
      setMetrics(metrics)

      setCriteria((prev) =>
        calculateRubricScores(
          prev,
          res.queueRunResult.finalWorkflowOutput,
          res.fitness
        )
      )
    } else if (isErrorResult(res)) {
      setMetrics({
        score: null,
        time: null,
        cost: null,
        output: `Error: ${res.error}`,
      })
    }
  }, [res, setMetrics, setCriteria])

  const handleSave = () => {
    const updates: Partial<WorkflowIO> = {}

    if (task !== io.input) {
      updates.input = task
    }

    if (Object.keys(updates).length > 0) {
      updateCase(io.id, updates)
    }
  }

  const handleRun = async () => {
    if (!canRun) return

    // Create the updated case with current input and expected values
    const updatedCase: WorkflowIO = {
      ...io,
      input: task,
      expected: io.expected,
    }

    // Save the updated case first
    updateCase(io.id, { input: task })

    // Clear previous results
    metricsHook.resetMetrics()

    // Run the workflow with the case
    if (onRun) {
      await onRun(updatedCase)
    } else if (workflowConfig) {
      await runOne(workflowConfig, updatedCase)
    }
  }

  // Fixed height for simpler layout
  const dynamicHeight = 140

  return (
    <>
      <tr>
        <td colSpan={6} className="p-1">
          <div
            className="w-full bg-white border border-gray-200 p-3 grid grid-cols-12 gap-3 transition-all duration-200"
            style={{ minHeight: `${dynamicHeight}px` }}
          >
            {/* Task */}
            <div className="col-span-3 flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">
                Task
              </label>
              <textarea
                className={`flex-1 w-full border rounded text-sm p-2 resize-none transition-colors focus:border-blue-500 focus:outline-none ${
                  task && task.trim().length < 10
                    ? "border-red-400 bg-red-50"
                    : "border-gray-300"
                }`}
                value={task}
                onChange={(e) => setTask(e.target.value)}
                onBlur={handleSave}
                disabled={!isTaskEditable}
                placeholder="Min 10 characters..."
              />
              {task && task.trim().length < 10 && (
                <p className="text-xs text-red-600 mt-1">Too short</p>
              )}
            </div>

            {/* Expected Output */}
            <div className="col-span-4 flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">
                Expected Output
              </label>
              <textarea
                className="flex-1 w-full border border-gray-300 rounded text-sm p-2 resize-none focus:border-blue-500 focus:outline-none"
                value={io.expected}
                onChange={(e) => updateCase(io.id, { expected: e.target.value })}
                placeholder="Enter expected output..."
                disabled={busy}
              />
            </div>

            {/* Output */}
            <div className="col-span-3 flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">
                Output
              </label>
              {metricsHook.metrics.output ? (
                <div className="flex-1 text-xs text-gray-700 bg-gray-50 rounded p-2 overflow-y-auto">
                  <SmartContent
                    value={metricsHook.metrics.output}
                    className="text-xs text-gray-700"
                    showExpanders={false}
                    enableClipboard={false}
                    stringifySpacing={2}
                  />
                </div>
              ) : (
                <div className="flex-1 text-xs text-gray-400 bg-gray-50 rounded p-2 flex items-center justify-center">
                  No output yet
                </div>
              )}
            </div>

            {/* Metrics */}
            <div className="col-span-1 flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">
                Metrics
              </label>
              <div className="flex-1 bg-gray-50 rounded p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 font-medium">Score</span>
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      metricsHook.metrics.score !== null
                        ? metricsHook.metrics.score >= 70
                          ? "text-green-600"
                          : "text-amber-600"
                        : "text-gray-400"
                    }`}
                  >
                    {metricsHook.metrics.score !== null
                      ? `${metricsHook.metrics.score}%`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 font-medium">Time</span>
                  <span className="text-xs font-medium text-gray-700 tabular-nums">
                    {metricsHook.metrics.time || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 font-medium">Cost</span>
                  <span className="text-xs font-medium text-gray-700 tabular-nums">
                    {metricsHook.metrics.cost || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="col-span-1 flex flex-col justify-start items-end gap-1.5 pt-4">
              <button
                onClick={handleRun}
                disabled={!canRun || busy}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  busy
                    ? "bg-gray-300 cursor-not-allowed"
                    : canRun
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-200 cursor-not-allowed"
                }`}
                title="Run"
              >
                {busy ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M8 5v10l8-5-8-5z" />
                  </svg>
                )}
              </button>

              <button
                className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
                  res && isInvokeWorkflowResult(res)
                    ? "border-gray-300 hover:bg-gray-50 cursor-pointer"
                    : "border-gray-200 opacity-30 cursor-not-allowed"
                }`}
                title="Trace"
                onClick={() => {
                  if (isInvokeWorkflowResult(res)) {
                    window.open(`/trace/${res.workflowInvocationId}`, "_blank")
                  }
                }}
                disabled={!res || !isInvokeWorkflowResult(res)}
              >
                <svg
                  className="w-3 h-3 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </button>

              <button
                onClick={() => setFeedbackOpen(true)}
                className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                title="Feedback"
              >
                <svg
                  className="w-3 h-3 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </button>

              <button
                onClick={() => removeCase(io.id)}
                disabled={busy}
                className="w-7 h-7 rounded-full border border-red-300 flex items-center justify-center hover:bg-red-50 transition-colors disabled:opacity-50"
                title="Delete"
              >
                <svg
                  className="w-3 h-3 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </td>
      </tr>

      {/* Feedback Dialog */}
      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        taskId={io.id}
        metrics={metricsHook.metrics}
        hasResults={rubric.hasRubricResults}
        totalAchievedPoints={rubric.totalAchievedPoints}
        totalMaxPoints={rubric.totalMaxPoints}
        workflowFeedback={isInvokeWorkflowResult(res) ? res.feedback : null}
      />
    </>
  )
}
