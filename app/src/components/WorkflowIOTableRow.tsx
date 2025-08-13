"use client"

import { Button } from "@/react-flow-visualization/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/react-flow-visualization/components/ui/dialog"
import { Textarea } from "@/react-flow-visualization/components/ui/textarea"
import { useRunConfigStore } from "@/stores/run-config-store"
import type { InvokeWorkflowResult } from "@core/workflow/runner/types"
import { useState, useEffect } from "react"
import { useShallow } from "zustand/react/shallow"
import type { WorkflowIO } from "./WorkflowIOTable"

type Props = {
  io: WorkflowIO
  index: number
}

type ErrorResult = { error: string }

type RubricCriteria = {
  id: string
  name: string
  maxPoints: number
  achievedPoints: number | null
}

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

type PropsWithConfig = Props & {
  workflowConfig?: any
  onRun?: (io: WorkflowIO) => Promise<void>
}

export default function WorkflowIOTableRow({
  io,
  index,
  workflowConfig,
  onRun,
}: PropsWithConfig) {
  const [task, setTask] = useState(io.input)
  const [criteria, setCriteria] = useState<RubricCriteria[]>([
    { id: "1", name: "Accuracy", maxPoints: 10, achievedPoints: null },
    { id: "2", name: "Completeness", maxPoints: 10, achievedPoints: null },
    { id: "3", name: "Clarity", maxPoints: 5, achievedPoints: null },
  ])

  // Feedback dialog state
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null)

  // Fake metrics with state
  const [metrics, setMetrics] = useState({
    score: null as number | null,
    time: null as string | null,
    cost: null as string | null,
    output: null as string | null,
  })

  const { busyIds, resultsById, updateCase, removeCase, runOne, cancel } =
    useRunConfigStore(
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
  const canRun = Boolean(task?.trim())

  const totalMaxPoints = criteria.reduce((sum, c) => sum + c.maxPoints, 0)
  const totalAchievedPoints = criteria.reduce(
    (sum, c) => sum + (c.achievedPoints || 0),
    0
  )
  const hasResults = criteria.some((c) => c.achievedPoints !== null)

  // Auto-save rubric when criteria change
  useEffect(() => {
    if (criteria.length === 0) return
    
    const rubricLines = criteria.map((criterion, index) => {
      const name = criterion.name.trim() || `Criterion ${index + 1}`
      return `${index + 1}. ${name} (${criterion.maxPoints} points)`
    })
    
    const rubricString = `Evaluation Rubric (Total: ${totalMaxPoints} points):\n${rubricLines.join('\n')}\n\nPlease evaluate the response according to these criteria and provide specific feedback for each criterion.`
    updateCase(io.id, { expected: rubricString })
  }, [criteria, totalMaxPoints, io.id, updateCase])

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

    // Create the current rubric string and update the case
    const rubricString = createRubricString()
    const updatedCase: WorkflowIO = { 
      ...io, 
      input: task, 
      expected: rubricString 
    }
    
    // Save the updated case first
    updateCase(io.id, { input: task, expected: rubricString })

    // Simulate metrics update
    const fakeOutputs = [
      "Task completed successfully with comprehensive analysis.",
      "Generated detailed report with 95% accuracy score.",
      "Processed request and provided actionable insights.",
      "Analysis complete: Found 3 key patterns in the data.",
      "Solution implemented with proper error handling.",
    ]

    setMetrics({
      score: Math.round(Math.random() * 100),
      time: `${(Math.random() * 10 + 1).toFixed(1)}s`,
      cost: `$${(Math.random() * 0.1).toFixed(3)}`,
      output: fakeOutputs[Math.floor(Math.random() * fakeOutputs.length)],
    })

    // Update achieved points with fake values
    setCriteria((prev) =>
      prev.map((c) => ({
        ...c,
        achievedPoints: Math.round(Math.random() * c.maxPoints),
      }))
    )

    // Run the workflow with task + rubric string
    if (onRun) {
      await onRun(updatedCase)
    } else if (workflowConfig) {
      await runOne(workflowConfig, updatedCase)
    }
  }

  const addCriteria = () => {
    const newId = String(criteria.length + 1)
    setCriteria((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        maxPoints: 5,
        achievedPoints: null,
      },
    ])
  }

  const updateCriteria = (id: string, updates: Partial<RubricCriteria>) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    )
  }

  const removeCriteria = (id: string) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id))
  }

  // Convert rubric criteria to human-readable string
  const createRubricString = () => {
    if (criteria.length === 0) return ""
    
    const rubricLines = criteria.map((criterion, index) => {
      const name = criterion.name.trim() || `Criterion ${index + 1}`
      return `${index + 1}. ${name} (${criterion.maxPoints} points)`
    })
    
    return `Evaluation Rubric (Total: ${totalMaxPoints} points):\n${rubricLines.join('\n')}\n\nPlease evaluate the response according to these criteria and provide specific feedback for each criterion.`
  }

  const handleFeedbackSubmit = () => {
    // Mock feedback submission
    console.log("Feedback submitted:", {
      taskId: io.id,
      rating: feedbackRating,
      feedback: feedbackText,
      timestamp: new Date().toISOString(),
    })

    // Reset form and close dialog
    setFeedbackText("")
    setFeedbackRating(null)
    setFeedbackOpen(false)

    // Could show a toast notification here
    alert("Feedback submitted successfully!")
  }

  // Dynamic height - let content determine height naturally
  const minHeight = 240 // Minimum height for consistent appearance

  return (
    <>
      <tr className="border border-gray-200">
        <td colSpan={6} className="p-0">
          {/* Jelle Prins-style Evaluation Dashboard */}
          <div
            className="w-full bg-white border border-gray-200 p-4 grid grid-cols-10 gap-4"
            style={{ minHeight: `${minHeight}px` }}
          >
            {/* Column 1 - Task Panel (20% = 2/10) */}
            <div className="col-span-2 flex flex-col">
              <label className="text-xs font-medium text-gray-600 uppercase mb-1">
                Task
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Define what the workflow should accomplish
              </p>
              <textarea
                className="flex-1 w-full border border-gray-300 rounded bg-white p-2 text-sm leading-relaxed resize-none focus:border-blue-500 focus:outline-none"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                onBlur={handleSave}
                disabled={busy}
                placeholder="Enter task description..."
              />
            </div>

            {/* Column 2 - Rubric & Points (50% = 5/10) */}
            <div className="col-span-5 flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-gray-600 uppercase">
                  Rubric
                </label>
                <label className="text-xs font-medium text-gray-600 uppercase">
                  Points
                </label>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                Similar to unit tests
              </p>

              {/* Criteria List */}
              <div className="flex-1 space-y-2">
                {criteria.map((criterion) => (
                  <div
                    key={criterion.id}
                    className="flex items-center gap-2 py-1"
                  >
                    <input
                      type="text"
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      value={criterion.name}
                      onChange={(e) =>
                        updateCriteria(criterion.id, { name: e.target.value })
                      }
                      placeholder="Criterion name"
                    />
                    <div className="flex items-center gap-1 text-sm">
                      {criterion.achievedPoints !== null ? (
                        <span className="font-bold text-green-600 w-8 text-right">
                          {criterion.achievedPoints}
                        </span>
                      ) : (
                        <span className="text-gray-400 w-8 text-right">—</span>
                      )}
                      <span className="text-gray-500">/</span>
                      <input
                        type="number"
                        className="w-10 border border-gray-300 rounded px-1 py-1 text-xs text-right focus:border-blue-500 focus:outline-none"
                        value={criterion.maxPoints}
                        onChange={(e) =>
                          updateCriteria(criterion.id, {
                            maxPoints: parseInt(e.target.value) || 0,
                          })
                        }
                        min="0"
                      />
                      <button
                        onClick={() => removeCriteria(criterion.id)}
                        className="ml-1 text-red-500 hover:text-red-700 text-xs w-4 h-4 flex items-center justify-center cursor-pointer"
                        title="Remove criterion"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Criteria Button */}
                <button
                  onClick={addCriteria}
                  className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer mt-2"
                >
                  + Add Criteria
                </button>

                {/* Total Score */}
                {hasResults && (
                  <div className="border-t pt-2 mt-2 flex justify-between items-center font-semibold">
                    <span>Total</span>
                    <span className="text-lg">
                      <span className="text-green-600">
                        {totalAchievedPoints}
                      </span>
                      <span className="text-gray-500">/{totalMaxPoints}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Column 3 - Metrics & Output (20% = 2/10) */}
            <div className="col-span-2 flex flex-col space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-600 block">Score</label>
                  <div className="text-sm font-bold">
                    {metrics.score !== null ? (
                      `${metrics.score}%`
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 block">Time</label>
                  <div className="text-xs font-bold">
                    {metrics.time || <span className="text-gray-400">—</span>}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 block">Cost</label>
                  <div className="text-xs font-bold">
                    {metrics.cost || <span className="text-gray-400">—</span>}
                  </div>
                </div>
              </div>

              {/* Output Section */}
              <div className="flex-1">
                <label className="text-xs text-gray-600 block mb-1">
                  Output
                </label>
                {metrics.output ? (
                  <div className="text-xs bg-gray-50 border rounded p-2 max-h-20 overflow-y-auto leading-relaxed">
                    {metrics.output}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 bg-gray-50 border rounded p-2 italic">
                    No output yet
                  </div>
                )}
              </div>
            </div>

            {/* Column 4 - Actions (10% = 1/10) */}
            <div className="col-span-1 flex flex-col justify-between items-center space-y-2">
              <button
                onClick={handleRun}
                disabled={!canRun || busy}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                  busy
                    ? "bg-gray-400 cursor-not-allowed"
                    : canRun
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-200 cursor-not-allowed"
                }`}
                title="Run Evaluation"
              >
                {busy ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M8 5v10l8-5-8-5z" />
                  </svg>
                )}
              </button>

              <button
                className="w-11 h-11 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
                title="View Trace"
                onClick={() => {
                  if (isInvokeWorkflowResult(res)) {
                    window.open(`/trace/${res.workflowInvocationId}`, "_blank")
                  }
                }}
              >
                <svg
                  className="w-5 h-5 text-gray-600"
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
                className="w-11 h-11 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
                title="Give Feedback"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              <button
                onClick={() => removeCase(io.id)}
                disabled={busy}
                className="w-11 h-11 rounded-full border border-red-200 flex items-center justify-center hover:bg-red-50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                title="Delete Row"
              >
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </td>
      </tr>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Provide Feedback</DialogTitle>
            <DialogDescription>
              Share your thoughts on this workflow execution. Your feedback
              helps improve future performance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Rating Section */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Overall Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setFeedbackRating(rating)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                      feedbackRating === rating
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-gray-300 hover:border-blue-300"
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Text */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Comments (optional)
              </label>
              <Textarea
                placeholder="What worked well? What could be improved? Any specific issues you noticed?"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Mock Analysis Section */}
            {hasResults && (
              <div className="border rounded-lg p-3 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Execution Summary
                </h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>
                    Score: {metrics.score}% | Time: {metrics.time} | Cost:{" "}
                    {metrics.cost}
                  </div>
                  <div>
                    Criteria Achievement: {totalAchievedPoints}/{totalMaxPoints}{" "}
                    points
                  </div>
                  <div className="text-gray-500 italic">
                    {metrics.output
                      ? `Output: "${metrics.output.substring(0, 80)}..."`
                      : "No output available"}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleFeedbackSubmit}
              disabled={feedbackRating === null}
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
