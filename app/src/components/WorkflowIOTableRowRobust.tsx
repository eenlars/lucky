"use client"

import { useState, useEffect, useCallback, memo } from "react"
import { useShallow } from "zustand/react/shallow"
import { useRunConfigStore } from "@/stores/run-config-store"
import type { WorkflowIO } from "./WorkflowIOTable"
import { useRubricManagementRobust } from "./hooks/useRubricManagementRobust"
import { useMetrics } from "./hooks/useMetrics"
import { useWorkflowExecution } from "./hooks/useWorkflowExecution"
import { useDebounce } from "./hooks/useDebounce"
import { isInvokeWorkflowResult, isErrorResult } from "./utils/result-utils"
import { parseWorkflowResultToMetrics, calculateRubricScores } from "./utils/workflow-integration"
import { validateTask, sanitizeInput } from "./utils/validation"
import FeedbackDialog from "./FeedbackDialog"
import { ErrorBoundary } from "./ErrorBoundary"

type Props = {
  io: WorkflowIO
  index: number
}

type PropsWithConfig = Props & {
  workflowConfig?: any
  onRun?: (io: WorkflowIO) => Promise<void>
}

// Memoized sub-components to prevent unnecessary re-renders
const TaskInput = memo(({ 
  value, 
  onChange, 
  onBlur, 
  disabled, 
  error 
}: { 
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  disabled: boolean
  error: string | null
}) => (
  <div className="flex-1 flex flex-col">
    <textarea
      className={`flex-1 w-full border rounded bg-white p-2 text-sm leading-relaxed resize-none focus:border-blue-500 focus:outline-none ${
        error ? 'border-red-300' : 'border-gray-300'
      }`}
      value={value}
      onChange={(e) => onChange(sanitizeInput(e.target.value))}
      onBlur={onBlur}
      disabled={disabled}
      placeholder="Enter task description..."
      aria-label="Task description"
      aria-invalid={!!error}
      aria-describedby={error ? "task-error" : undefined}
    />
    {error && (
      <span id="task-error" className="text-xs text-red-600 mt-1">{error}</span>
    )}
  </div>
))
TaskInput.displayName = 'TaskInput'

const RubricCriterion = memo(({ 
  criterion, 
  onUpdate, 
  onRemove, 
  canRemove,
  error 
}: { 
  criterion: RubricCriteria
  onUpdate: (id: string, updates: Partial<RubricCriteria>) => void
  onRemove: (id: string) => void
  canRemove: boolean
  error?: string[]
}) => (
  <div className="flex items-center gap-2 py-1">
    <input
      type="text"
      className={`flex-1 border rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none ${
        error?.length ? 'border-red-300' : 'border-gray-300'
      }`}
      value={criterion.name}
      onChange={(e) => onUpdate(criterion.id, { name: sanitizeInput(e.target.value) })}
      placeholder="Criterion name"
      aria-label={`Criterion ${criterion.id} name`}
      aria-invalid={!!error?.length}
    />
    <div className="flex items-center gap-1 text-sm">
      {criterion.achievedPoints !== null ? (
        <span className="font-bold text-green-600 w-8 text-right">
          {criterion.achievedPoints}
        </span>
      ) : (
        <span className="text-gray-400 w-8 text-right" aria-label="No score yet">—</span>
      )}
      <span className="text-gray-500">/</span>
      <input
        type="number"
        className={`w-10 border rounded px-1 py-1 text-xs text-right focus:border-blue-500 focus:outline-none ${
          error?.length ? 'border-red-300' : 'border-gray-300'
        }`}
        value={criterion.maxPoints}
        onChange={(e) => onUpdate(criterion.id, { maxPoints: parseInt(e.target.value) || 0 })}
        min="1"
        max="100"
        aria-label={`Maximum points for ${criterion.name || 'criterion'}`}
      />
      <button
        onClick={() => onRemove(criterion.id)}
        className="ml-1 text-red-500 hover:text-red-700 text-xs w-4 h-4 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        title="Remove criterion"
        disabled={!canRemove}
        aria-label={`Remove ${criterion.name || 'criterion'}`}
      >
        ×
      </button>
    </div>
    {error?.map((err, i) => (
      <span key={i} className="text-xs text-red-600 block">{err}</span>
    ))}
  </div>
))
RubricCriterion.displayName = 'RubricCriterion'

function WorkflowIOTableRowContent({ io, workflowConfig, onRun }: PropsWithConfig) {
  const [task, setTask] = useState(io.input)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [taskError, setTaskError] = useState<string | null>(null)
  
  // Debounced task for validation
  const debouncedTask = useDebounce(task, 300)
  
  const {
    busyIds,
    resultsById,
    updateCase,
    removeCase,
    runOne,
  } = useRunConfigStore(
    useShallow((s) => ({
      busyIds: s.busyIds,
      resultsById: s.resultsById,
      updateCase: s.updateCase,
      removeCase: s.removeCase,
      runOne: s.runOne,
    }))
  )

  // Use robust hooks
  const rubric = useRubricManagementRobust(io.id, updateCase)
  const metricsHook = useMetrics()
  const workflowExecution = useWorkflowExecution({
    maxRetries: 2,
    timeoutMs: 180000, // 3 minutes
    onProgress: (progress) => {
      console.log(`Workflow ${io.id} progress: ${progress}%`)
    },
    onStatusChange: (status) => {
      console.log(`Workflow ${io.id} status: ${status}`)
    }
  })

  const busy = busyIds?.has(io.id) || workflowExecution.isRunning
  const res = resultsById[io.id]
  const canRun = Boolean(task?.trim()) && !taskError && rubric.isValid

  // Validate task on change
  useEffect(() => {
    const error = validateTask(debouncedTask)
    setTaskError(error)
  }, [debouncedTask])

  // Update metrics and rubric scores when workflow results come in
  useEffect(() => {
    if (!res) return
    
    if (isInvokeWorkflowResult(res)) {
      // Update metrics from real workflow results
      const metrics = parseWorkflowResultToMetrics(res)
      metricsHook.setMetrics(metrics)
      
      // Calculate rubric scores based on workflow fitness
      const updatedCriteria = calculateRubricScores(
        rubric.criteria,
        res.queueRunResult.finalWorkflowOutput,
        res.fitness
      )
      rubric.setCriteria(updatedCriteria)
      
      workflowExecution.reset()
    } else if (isErrorResult(res)) {
      // Handle error state
      metricsHook.setMetrics({
        score: null,
        time: null,
        cost: null,
        output: `Error: ${res.error}`,
      })
      
      workflowExecution.reset()
    }
  }, [res]) // Intentionally limited dependencies to prevent loops

  const handleSave = useCallback(() => {
    const updates: Partial<WorkflowIO> = {}
    
    if (task !== io.input) {
      updates.input = task
    }
    
    if (Object.keys(updates).length > 0) {
      updateCase(io.id, updates)
    }
  }, [task, io.input, io.id, updateCase])

  const handleRun = useCallback(async () => {
    if (!canRun) return

    // Validate before running
    const taskValidationError = validateTask(task)
    if (taskValidationError) {
      setTaskError(taskValidationError)
      return
    }

    // Create the current rubric string and update the case
    const rubricString = rubric.createRubricString()
    const updatedCase: WorkflowIO = { 
      ...io, 
      input: task, 
      expected: rubricString 
    }
    
    // Save the updated case first
    updateCase(io.id, { input: task, expected: rubricString })

    // Clear previous results
    metricsHook.resetMetrics()

    // Run the workflow with robust execution handling
    try {
      if (onRun) {
        await workflowExecution.executeWorkflow(
          async () => onRun(updatedCase),
          null,
          updatedCase
        )
      } else if (workflowConfig) {
        await workflowExecution.executeWorkflow(
          runOne,
          workflowConfig,
          updatedCase
        )
      }
    } catch (error) {
      console.error('Workflow execution failed:', error)
    }
  }, [canRun, task, rubric, io, updateCase, onRun, workflowConfig, runOne, workflowExecution, metricsHook])

  const handleDelete = useCallback(() => {
    if (busy) return
    
    const confirmed = window.confirm('Are you sure you want to delete this test case?')
    if (confirmed) {
      rubric.clearStoredData()
      removeCase(io.id)
    }
  }, [busy, io.id, removeCase, rubric])

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
              <label className="text-xs font-medium text-gray-600 uppercase mb-1">Task</label>
              <p className="text-xs text-gray-500 mb-2">Define what the workflow should accomplish</p>
              <TaskInput
                value={task}
                onChange={setTask}
                onBlur={handleSave}
                disabled={busy}
                error={taskError}
              />
            </div>

            {/* Column 2 - Rubric & Points (50% = 5/10) */}
            <div className="col-span-5 flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-gray-600 uppercase">
                  Rubric {rubric.isUpdating && <span className="text-blue-500">(saving...)</span>}
                </label>
                <label className="text-xs font-medium text-gray-600 uppercase">Points</label>
              </div>
              <p className="text-xs text-gray-500 mb-2">Think of these as your unit tests</p>
              
              {/* Criteria List */}
              <div className="flex-1 space-y-2 overflow-y-auto max-h-96">
                {rubric.criteria.map((criterion) => (
                  <RubricCriterion
                    key={criterion.id}
                    criterion={criterion}
                    onUpdate={rubric.updateCriteria}
                    onRemove={rubric.removeCriteria}
                    canRemove={rubric.criteria.length > 1}
                    error={rubric.validationErrors[criterion.id]}
                  />
                ))}
                
                {/* Add Criteria Button */}
                <button
                  onClick={rubric.addCriteria}
                  className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer mt-2 disabled:opacity-50"
                  disabled={rubric.criteria.length >= 20}
                >
                  + Add Criteria {rubric.criteria.length >= 20 && '(max reached)'}
                </button>
                
                {/* Total Score */}
                {rubric.hasRubricResults && (
                  <div className="border-t pt-2 mt-2 flex justify-between items-center font-semibold">
                    <span>Total</span>
                    <span className="text-lg">
                      <span className="text-green-600">{rubric.totalAchievedPoints}</span>
                      <span className="text-gray-500">/{rubric.totalMaxPoints}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Column 3 - Metrics & Output (20% = 2/10) */}
            <div className="col-span-2 flex flex-col space-y-3">
              {/* Execution Status */}
              {workflowExecution.state.status !== 'idle' && (
                <div className="bg-blue-50 rounded p-2 text-xs">
                  <div className="font-medium text-blue-700">
                    {workflowExecution.state.status === 'running' ? 'Running...' : workflowExecution.state.status}
                  </div>
                  {workflowExecution.state.message && (
                    <div className="text-blue-600 mt-1">{workflowExecution.state.message}</div>
                  )}
                  {workflowExecution.state.progress > 0 && workflowExecution.state.status === 'running' && (
                    <div className="mt-2">
                      <div className="bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${workflowExecution.state.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-600 block">Score</label>
                  <div className="text-sm font-bold">
                    {metricsHook.metrics.score !== null ? `${metricsHook.metrics.score}%` : <span className="text-gray-400">—</span>}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 block">Time</label>
                  <div className="text-xs font-bold">
                    {metricsHook.metrics.time || <span className="text-gray-400">—</span>}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 block">Cost</label>
                  <div className="text-xs font-bold">
                    {metricsHook.metrics.cost || <span className="text-gray-400">—</span>}
                  </div>
                </div>
              </div>
              
              {/* Output Section */}
              <div className="flex-1">
                <label className="text-xs text-gray-600 block mb-1">Output</label>
                {metricsHook.metrics.output ? (
                  <div className="text-xs bg-gray-50 border rounded p-2 max-h-20 overflow-y-auto leading-relaxed">
                    {metricsHook.metrics.output}
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
                    ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    : "bg-gray-200 cursor-not-allowed"
                }`}
                title={busy ? "Workflow running..." : canRun ? "Run Evaluation" : "Fix errors to run"}
                aria-label="Run evaluation"
              >
                {busy ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 5v10l8-5-8-5z" />
                  </svg>
                )}
              </button>
              
              <button
                className="w-11 h-11 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                title="View Trace"
                onClick={() => {
                  if (isInvokeWorkflowResult(res)) {
                    window.open(`/trace/${res.workflowInvocationId}`, '_blank')
                  }
                }}
                disabled={!isInvokeWorkflowResult(res)}
                aria-label="View workflow trace"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
              
              <button
                onClick={() => setFeedbackOpen(true)}
                className="w-11 h-11 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
                title="Give Feedback"
                aria-label="Give feedback"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <button
                onClick={handleDelete}
                disabled={busy}
                className="w-11 h-11 rounded-full border border-red-200 flex items-center justify-center hover:bg-red-50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                title="Delete Row"
                aria-label="Delete test case"
              >
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

export default function WorkflowIOTableRowRobust(props: PropsWithConfig) {
  return (
    <ErrorBoundary>
      <WorkflowIOTableRowContent {...props} />
    </ErrorBoundary>
  )
}