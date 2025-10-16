/**
 * EmptyResponseError Component
 *
 * Shows when AI model returns 0 tokens/content (quota/payment issues)
 */

import { AlertCircle } from "lucide-react"

interface EmptyResponseErrorProps {
  modelName?: string
  onRetry?: () => void
}

export function EmptyResponseError({ modelName, onRetry }: EmptyResponseErrorProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
      <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-yellow-900 dark:text-yellow-100">
          No response received. Check your API credits or try a different model.
        </p>
        {modelName && <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">Using: {modelName}</p>}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-100"
        >
          ✕
        </button>
      )}
    </div>
  )
}
