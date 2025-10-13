"use client"

import { ChevronDown, Trash2 } from "lucide-react"
import { useState } from "react"
import { formatSessionLabel } from "./sessionManager"
import type { ExecutionSession } from "./types"

interface SessionSelectorProps {
  sessions: ExecutionSession[]
  currentSessionId: string | null
  onSessionSelect: (sessionId: string) => void
  onClearHistory: () => void
}

export function SessionSelector({ sessions, currentSessionId, onSessionSelect, onClearHistory }: SessionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const currentSession = sessions.find(s => s.id === currentSessionId)

  const handleClearHistory = () => {
    onClearHistory()
    setShowConfirm(false)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-3 text-sm border border-gray-200 dark:border-white/10 rounded hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 max-w-[280px]"
      >
        <span className="truncate">{currentSession ? formatSessionLabel(currentSession) : "No session"}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            <div className="p-2">
              {sessions.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 p-2">No session history</div>
              ) : (
                sessions.map(session => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => {
                      onSessionSelect(session.id)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-white/5 text-sm ${
                      session.id === currentSessionId ? "bg-gray-100 dark:bg-white/5" : ""
                    }`}
                  >
                    {formatSessionLabel(session)}
                  </button>
                ))
              )}
            </div>

            {sessions.length > 0 && (
              <>
                <div className="border-t border-gray-200 dark:border-white/10" />
                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  className="w-full p-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 rounded-b-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear history
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Clear log history?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This will delete all stored execution logs. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
