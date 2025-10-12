import type { WorkflowInvocationWithScores } from "../lib/types"

interface SummaryCardsProps {
  invocations: WorkflowInvocationWithScores[]
  totalItems: number
}

export function SummaryCards({ invocations, totalItems }: SummaryCardsProps) {
  const totalSpent = invocations.reduce((sum, inv) => sum + inv.usd_cost, 0)
  const invocationsWithAccuracy = invocations.filter(i => i.accuracy != null)
  const avgAccuracy =
    invocationsWithAccuracy.length > 0
      ? invocationsWithAccuracy.reduce((sum, inv) => sum + (inv.accuracy || 0), 0) / invocationsWithAccuracy.length
      : 0
  const failedCount = invocations.filter(i => i.status === "failed").length

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Total Runs
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalItems}</div>
      </div>
      <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Total Spent
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">${totalSpent.toFixed(4)}</div>
      </div>
      <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Avg Accuracy
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {invocationsWithAccuracy.length > 0 ? avgAccuracy.toFixed(2) : "n/a"}
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Failed</div>
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{failedCount}</div>
      </div>
    </div>
  )
}
