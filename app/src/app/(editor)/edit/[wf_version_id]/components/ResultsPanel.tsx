"use client"

import { SmartContent } from "@/components/utils/SmartContent"
interface ResultsPanelProps {
  results: any
  error?: string | null
}

export default function ResultsPanel({ results, error }: ResultsPanelProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900">Execution Results</h3>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        {error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-700 font-medium mb-2">Execution Error</div>
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        ) : results ? (
          <div className="space-y-4">
            {results.success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-green-700 font-medium">{results.message}</div>
                {results.usdCost && (
                  <div className="text-green-600 text-sm mt-1">Cost: ${results.usdCost.toFixed(4)}</div>
                )}
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Raw Results</div>
              <SmartContent value={results} className="text-xs text-gray-700" collapsed={2} />
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <div className="text-lg mb-2">No results yet</div>
            <div className="text-sm">Run a workflow to see results here</div>
          </div>
        )}
      </div>
    </div>
  )
}
