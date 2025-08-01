"use client"

import { useState } from "react"

interface ActionBarProps {
  onSave: (commitMessage: string) => Promise<void>
  onRun: () => Promise<void>
  isDirty: boolean
  isLoading: boolean
  saveError?: string | null
}

export default function ActionBar({
  onSave,
  onRun,
  isDirty,
  isLoading,
  saveError,
}: ActionBarProps) {
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [commitMessage, setCommitMessage] = useState("")

  const handleSaveClick = () => {
    setShowSaveModal(true)
  }

  const handleSaveConfirm = async () => {
    if (commitMessage.trim()) {
      await onSave(commitMessage)
      setShowSaveModal(false)
      setCommitMessage("")
    }
  }

  const handleSaveCancel = () => {
    setShowSaveModal(false)
    setCommitMessage("")
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={handleSaveClick}
          disabled={!isDirty || isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          data-save-button
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            "Save"
          )}
        </button>

        <button
          onClick={onRun}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Running...
            </>
          ) : (
            "Run"
          )}
        </button>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Save Workflow Version
            </h3>

            {saveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-red-700 text-sm">{saveError}</div>
              </div>
            )}

            <div className="mb-4">
              <label
                htmlFor="commitMessage"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Commit Message
              </label>
              <textarea
                id="commitMessage"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe the changes you made..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={handleSaveCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfirm}
                disabled={!commitMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
