"use client"

import { Button } from "@/components/ui/button"

type SaveModalProps = {
  open: boolean
  onClose: () => void
  commitMessage: string
  setCommitMessage: (val: string) => void
  isLoading: boolean
  onSave: () => void
  saveError: string | null
}

export default function SaveModal({
  open,
  onClose,
  commitMessage,
  setCommitMessage,
  isLoading,
  onSave,
  saveError,
}: SaveModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-xl max-w-md w-full mx-4 shadow-2xl transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2"
                />
              </svg>
              Save Workflow Version
            </h3>
            <Button onClick={onClose} variant="ghost" size="sm" className="h-auto p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>

        <div className="px-6 py-4">
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-red-700 text-sm">{saveError}</div>
            </div>
          )}

          <div>
            <label htmlFor="commitMessage" className="block text-sm font-medium text-gray-700 mb-2">
              What changes did you make?
            </label>
            <textarea
              id="commitMessage"
              value={commitMessage}
              onChange={e => setCommitMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && commitMessage.trim() && !isLoading) {
                  e.preventDefault()
                  onSave()
                }
              }}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="e.g., Added error handling to data processor node"
            />
            <p className="mt-2 text-xs text-gray-500">
              {commitMessage.length > 0
                ? `${commitMessage.length} characters`
                : "Write a brief description of your changes"}
            </p>
          </div>

          {commitMessage.length === 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">Quick options:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Initial workflow setup",
                  "Added new processing node",
                  "Fixed validation errors",
                  "Updated node connections",
                  "Improved error handling",
                ].map(suggestion => (
                  <Button
                    key={suggestion}
                    onClick={() => setCommitMessage(suggestion)}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-1.5"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {navigator.platform.indexOf("Mac") > -1 ? "⌘" : "Ctrl"}+Enter to save
            </p>
            <div className="flex gap-3">
              <Button onClick={onClose} variant="ghost">
                Cancel
              </Button>
              <Button onClick={onSave} disabled={!commitMessage.trim() || isLoading}>
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Version
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
