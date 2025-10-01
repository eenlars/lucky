"use client"

import React from "react"

interface FailedRunProps {
  runId: string
  totalInvocations: number
  successfulInvocations: number
  evolutionGoal: string
  runStatus: string
  startTime: string
  endTime?: string
}

export function FailedRunVisualization({
  runId,
  totalInvocations,
  successfulInvocations,
  evolutionGoal,
  runStatus,
  startTime,
  endTime,
}: FailedRunProps) {
  const failureRate =
    totalInvocations > 0 ? (((totalInvocations - successfulInvocations) / totalInvocations) * 100).toFixed(1) : "100"
  const duration = endTime
    ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60))
    : null

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">⚠️ Failed Evolution Run</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          This evolution run encountered issues and has limited visualization data
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600">{failureRate}%</div>
          <div className="text-sm text-gray-600">Failure Rate</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600">{totalInvocations}</div>
          <div className="text-sm text-gray-600">Total Attempts</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{successfulInvocations}</div>
          <div className="text-sm text-gray-600">Successful</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <div className="text-lg font-bold text-gray-600">{runStatus}</div>
          <div className="text-sm text-gray-600">Status</div>
        </div>
      </div>

      {/* Evolution Goal */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Evolution Goal</h3>
        <p className="text-gray-700 leading-relaxed">{evolutionGoal}</p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Run ID:</span>{" "}
            <code className="text-xs bg-gray-200 px-1 rounded">{runId}</code>
          </div>
          <div>
            <span className="font-medium">Started:</span> {new Date(startTime).toLocaleString()}
          </div>
          {duration && (
            <div>
              <span className="font-medium">Duration:</span> {duration} minutes
            </div>
          )}
        </div>
      </div>

      {/* Failure Analysis */}
      <div className="bg-white p-6 rounded-lg border border-red-200">
        <h3 className="text-lg font-semibold mb-4 text-red-700">⚠️ Analysis</h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2"></div>
            <div>
              <div className="font-medium">High Failure Rate</div>
              <div className="text-sm text-gray-600">
                {failureRate}% of invocations failed, indicating potential issues with:
              </div>
              <ul className="text-sm text-gray-600 ml-4 mt-1 list-disc">
                <li>Workflow configuration</li>
                <li>Tool availability or errors</li>
                <li>Resource constraints</li>
                <li>Network or system issues</li>
              </ul>
            </div>
          </div>

          {successfulInvocations === 0 && (
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2"></div>
              <div>
                <div className="font-medium">Zero Successful Completions</div>
                <div className="text-sm text-gray-600">
                  No workflows completed successfully, preventing detailed evolution analysis.
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <div className="font-medium">Limited Visualization</div>
              <div className="text-sm text-gray-600">
                Without successful completions, we cannot show accuracy progression, fitness evolution, or detailed
                performance metrics.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold mb-4 text-blue-700">💡 Recommendations</h3>
        <div className="space-y-2 text-sm">
          <div>• Look for evolution runs with ✅ icons in the dropdown for successful completions</div>
          <div>
            • Check system logs around{" "}
            <code className="bg-white px-1 rounded">{new Date(startTime).toLocaleString()}</code> for error details
          </div>
          <div>• Consider reviewing workflow configuration for potential issues</div>
          <div>• Verify tool availability and permissions</div>
        </div>
      </div>
    </div>
  )
}
