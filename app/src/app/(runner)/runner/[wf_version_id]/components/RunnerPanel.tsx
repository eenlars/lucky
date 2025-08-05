"use client"

import type { Tables } from "@core/utils/clients/supabase/types"

interface RunnerPanelProps {
  results: any
  error?: string | null
  isRunning: boolean
  workflowVersion: Tables<"WorkflowVersion">
  invocationId?: string | null
}

export default function RunnerPanel({
  results,
  error,
  isRunning,
  workflowVersion,
  invocationId,
}: RunnerPanelProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Workflow Overview */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Workflow Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Operation</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {workflowVersion.operation}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(workflowVersion.created_at).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Budget</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {workflowVersion.iteration_budget} iterations,{" "}
              {workflowVersion.time_budget_seconds}s
            </dd>
          </div>
        </div>
      </div>

      {/* Execution Results */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Execution Results
        </h2>

        {isRunning && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Running workflow...</p>
              {invocationId && (
                <p className="text-sm text-gray-500 mt-2">
                  Invocation ID:{" "}
                  <span className="font-mono font-medium">{invocationId}</span>
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                This page will auto-refresh if you navigate away and come back
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-red-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <h3 className="text-red-800 font-medium">Execution Error</h3>
            </div>
            <p className="text-red-700 mt-2">{error}</p>
          </div>
        )}

        {results && !isRunning && (
          <div className="space-y-4">
            {results.success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <h3 className="text-green-800 font-medium">
                    Execution Successful
                  </h3>
                </div>
                <p className="text-green-700 mt-1">{results.message}</p>
                {results.usdCost && (
                  <p className="text-green-600 text-sm mt-2">
                    Cost: ${results.usdCost.toFixed(4)}
                  </p>
                )}
              </div>
            )}

            {/* Workflow Output */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">
                Workflow Results
              </h3>
              <div className="bg-gray-50 rounded p-3 max-h-96 overflow-auto">
                {results.data ? (
                  <div className="space-y-3">
                    {results.data.workflowInvocationId && (
                      <div>
                        <span className="font-medium text-gray-900">
                          Invocation ID:
                        </span>
                        <span className="ml-2 text-gray-700">
                          {results.data.workflowInvocationId}
                        </span>
                      </div>
                    )}
                    {results.data.finalWorkflowOutputs && (
                      <div>
                        <span className="font-medium text-gray-900">
                          Final Outputs:
                        </span>
                        <pre className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(
                            results.data.finalWorkflowOutputs,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    )}
                    {results.data.feedback && (
                      <div>
                        <span className="font-medium text-gray-900">
                          Feedback:
                        </span>
                        <pre className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(results.data.feedback, null, 2)}
                        </pre>
                      </div>
                    )}
                    {results.data.queueRunResult && (
                      <div>
                        <span className="font-medium text-gray-900">
                          Queue Run Result:
                        </span>
                        <pre className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(results.data.queueRunResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No output available</p>
                )}
              </div>
            </div>

            {/* Fitness Details */}
            {results.fitness && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">
                  Fitness Details
                </h3>
                <div className="bg-gray-50 rounded p-3">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(results.fitness, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {!results && !error && !isRunning && (
          <div className="text-center py-12 text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1a4 4 0 014 4v1M9 10V9a4 4 0 014-4h1M9 10H8a4 4 0 00-4 4v1M9 10v1a4 4 0 01-4 4H4"
              />
            </svg>
            <p className="text-lg mb-2">Ready to run</p>
            <p className="text-sm">
              click &quot;Run Workflow&quot; to execute this workflow
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
