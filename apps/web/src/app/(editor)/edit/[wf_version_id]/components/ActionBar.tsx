"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"

interface ActionBarProps {
  onSave: (commitMessage: string) => Promise<void>
  onRun: () => Promise<void>
  isDirty: boolean
  isLoading: boolean
}

export default function ActionBar({ onSave, onRun, isDirty, isLoading }: ActionBarProps) {
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
        <Button onClick={handleSaveClick} disabled={!isDirty || isLoading} data-save-button>
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>

        <Button onClick={onRun} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Running...
            </>
          ) : (
            "Run"
          )}
        </Button>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Workflow Version</h3>

            <div className="mb-4">
              <label htmlFor="commitMessage" className="block text-sm font-medium text-gray-700 mb-2">
                Commit Message
              </label>
              <textarea
                id="commitMessage"
                value={commitMessage}
                onChange={e => setCommitMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe the changes you made..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={handleSaveCancel} variant="ghost">
                Cancel
              </Button>
              <Button onClick={handleSaveConfirm} disabled={!commitMessage.trim()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
