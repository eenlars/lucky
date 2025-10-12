interface SummaryCardsProps {
  totalItems: number
  aggregates: {
    totalSpent: number
    avgAccuracy: number | null
    failedCount: number
  }
}

export function SummaryCards({ totalItems, aggregates }: SummaryCardsProps) {
  const { totalSpent, avgAccuracy, failedCount } = aggregates

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
          {avgAccuracy != null ? avgAccuracy.toFixed(2) : "n/a"}
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Failed</div>
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{failedCount}</div>
      </div>
    </div>
  )
}
