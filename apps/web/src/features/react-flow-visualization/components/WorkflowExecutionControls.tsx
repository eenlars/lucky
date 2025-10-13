"use client"

import { useState } from "react"
import { useExecutionStore } from "../store/execution-store"

interface WorkflowExecutionControlsProps {
  invocationId: string
}

/**
 * Controls for workflow execution, including cancel button.
 * Only shows when a workflow is actively executing.
 */
export function WorkflowExecutionControls({ invocationId }: WorkflowExecutionControlsProps) {
  const { isExecuting, isCancelling, cancel } = useExecutionStore()
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isExecuting) return null

  const handleCancel = async () => {
    setShowConfirm(false)
    setError(null)

    try {
      await cancel(invocationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel workflow")
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isCancelling}
        className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isCancelling ? "Cancelling..." : "Cancel Workflow"}
      </button>

      {error && <div className="text-sm text-red-600 px-2 py-1 bg-red-50 rounded">{error}</div>}

      {showConfirm && (
        <ConfirmDialog
          title="Cancel Workflow?"
          message="The workflow will stop after the current node completes. Partial progress will be lost, but you'll only be charged for completed nodes."
          onConfirm={handleCancel}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}

interface ConfirmDialogProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({ title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Keep Running
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
          >
            Cancel Workflow
          </button>
        </div>
      </div>
    </div>
  )
}
