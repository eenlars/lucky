"use client"

import { X } from "lucide-react"
import { useShallow } from "zustand/react/shallow"

import { Button } from "@/features/react-flow-visualization/components/ui/button"
import { useAppStore } from "@/features/react-flow-visualization/store/store"
import { cn } from "@/lib/utils"
import { useState } from "react"

export function ErrorDetailsPanel() {
  const { workflowValidationErrors, errorPanelOpen, setErrorPanelOpen, removeValidationError, clearValidationErrors } =
    useAppStore(
      useShallow(state => ({
        workflowValidationErrors: state.workflowValidationErrors,
        errorPanelOpen: state.errorPanelOpen,
        setErrorPanelOpen: state.setErrorPanelOpen,
        removeValidationError: state.removeValidationError,
        clearValidationErrors: state.clearValidationErrors,
      })),
    )

  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(
    workflowValidationErrors.length > 0 ? workflowValidationErrors[0]?.id : null,
  )

  if (!errorPanelOpen || workflowValidationErrors.length === 0) {
    return null
  }

  const errorCount = workflowValidationErrors.length
  const errorLabel = errorCount === 1 ? "error" : "errors"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Workflow Errors</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {errorCount} {errorLabel} found
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorPanelOpen(false)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Close errors"
          >
            <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        {/* Error List */}
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {workflowValidationErrors.map(error => (
              <div
                key={error.id}
                className={cn(
                  "border-l-4 transition-colors",
                  error.severity === "error"
                    ? "border-l-red-500 bg-red-50/30 dark:bg-red-900/10"
                    : "border-l-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/10",
                )}
              >
                <button
                  onClick={() => setExpandedErrorId(expandedErrorId === error.id ? null : error.id)}
                  className="w-full px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {error.severity === "error" ? (
                          <div className="p-1 rounded-full bg-red-200 dark:bg-red-900/40 flex-shrink-0">
                            <svg
                              className="w-3 h-3 text-red-600 dark:text-red-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        ) : (
                          <div className="p-1 rounded-full bg-yellow-200 dark:bg-yellow-900/40 flex-shrink-0">
                            <svg
                              className="w-3 h-3 text-yellow-600 dark:text-yellow-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{error.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{error.description}</p>
                    </div>
                    <svg
                      className={cn("w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500 transition-transform", {
                        "rotate-180": expandedErrorId === error.id,
                      })}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>

                  {/* Expanded Details */}
                  {expandedErrorId === error.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{error.description}</p>
                    </div>
                  )}
                </button>

                {/* Delete Button */}
                {expandedErrorId === error.id && (
                  <div className="px-6 pb-4 flex justify-end">
                    <button
                      onClick={() => removeValidationError(error.id)}
                      className="text-xs px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Showing {errorCount} error(s)</p>
          <div className="flex gap-2">
            <Button
              onClick={() => clearValidationErrors()}
              variant="ghost"
              size="sm"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Clear All
            </Button>
            <Button onClick={() => setErrorPanelOpen(false)} variant="ghost" size="sm">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
