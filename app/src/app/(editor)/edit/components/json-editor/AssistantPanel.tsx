"use client"

type AssistantPanelProps = {
  feedback: string
  setFeedback: (value: string) => void
  isOptimizing: boolean
  optimizeError: string | null
  onOptimize: () => void
}

export default function AssistantPanel({
  feedback,
  setFeedback,
  isOptimizing,
  optimizeError,
  onOptimize,
}: AssistantPanelProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Change the workflow
          </h3>
          <span className="text-xs text-gray-500">
            {feedback.length > 0 ? `${feedback.length} chars` : "Ready to help"}
          </span>
        </div>

        {optimizeError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{optimizeError}</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  (e.metaKey || e.ctrlKey) &&
                  !isOptimizing &&
                  feedback.trim()
                ) {
                  e.preventDefault()
                  onOptimize()
                }
              }}
              placeholder="Tell me what you want to build or improve..."
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {navigator.platform.indexOf("Mac") > -1 ? "⌘" : "Ctrl"}+Enter
            </div>
          </div>

          <button
            onClick={onOptimize}
            disabled={isOptimizing || !feedback.trim()}
            className={`
              w-full px-4 py-2.5 rounded-lg font-medium text-sm
              transition-all duration-200 flex items-center justify-center gap-2
              ${
                feedback.trim() && !isOptimizing
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-sm cursor-pointer"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }
            `}
          >
            {isOptimizing ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating workflow...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Generate with AI
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
