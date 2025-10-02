import { Button } from "@/ui/button"
import type { Tables } from "@lucky/shared/client"
import Link from "next/link"

type EditorHeaderProps = {
  workflowVersion?: Tables<"WorkflowVersion">
  isDirty: boolean
  isLoading: boolean
  jsonParseError: string | null
  lastSaved: Date | null
  autoSaveEnabled: boolean
  formatTime: (date: Date) => string
  onOpenSaveModal: () => void
}

export default function EditorHeader({
  workflowVersion,
  isDirty,
  isLoading,
  jsonParseError,
  lastSaved,
  autoSaveEnabled,
  formatTime,
  onOpenSaveModal,
}: EditorHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-base font-medium text-gray-900">
                {workflowVersion ? workflowVersion.commit_message || "Untitled Workflow" : "New Workflow"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                <span>{workflowVersion?.wf_version_id || "Not saved yet"}</span>
                {isDirty && (
                  <span className="text-amber-600 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                    Modified
                  </span>
                )}
                {jsonParseError && (
                  <span className="text-red-600 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    JSON Error
                  </span>
                )}
                {lastSaved && autoSaveEnabled && (
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Draft saved {formatTime(lastSaved)}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {workflowVersion && (
            <Link
              href={"/"}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-md hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Run
            </Link>
          )}

          <div className="relative group">
            <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </Button>
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Keyboard Shortcuts</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Save workflow</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700">⌘S</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Focus AI assistant</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700">⌘K</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Clear draft</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700">⌘D</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Close modals</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={onOpenSaveModal}
            disabled={!isDirty || isLoading || !!jsonParseError}
            variant={isDirty && !jsonParseError ? "default" : "secondary"}
            title={
              jsonParseError ? "Fix JSON errors before saving" : isDirty ? "Save changes (⌘S)" : "No changes to save"
            }
          >
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2"
                  />
                </svg>
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
