"use client"

import { ChevronDown, ChevronUp, Search, X } from "lucide-react"
import { useEffect, useRef } from "react"

interface LogSearchProps {
  query: string
  onQueryChange: (query: string) => void
  currentMatch: number
  totalMatches: number
  onPrevMatch: () => void
  onNextMatch: () => void
  onClear: () => void
}

export function LogSearch({
  query,
  onQueryChange,
  currentMatch,
  totalMatches,
  onPrevMatch,
  onNextMatch,
  onClear,
}: LogSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on Cmd/Ctrl+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="flex items-center gap-2 flex-1 max-w-sm">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Search logs..."
          className="w-full h-8 pl-9 pr-20 text-sm border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-white/20"
        />

        {query && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {totalMatches > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {currentMatch + 1}/{totalMatches}
              </span>
            )}
            <button type="button" onClick={onClear} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded">
              <X className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      {query && totalMatches > 0 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevMatch}
            className="p-1.5 border border-gray-200 dark:border-white/10 rounded hover:bg-gray-50 dark:hover:bg-white/5"
            disabled={totalMatches === 0}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onNextMatch}
            className="p-1.5 border border-gray-200 dark:border-white/10 rounded hover:bg-gray-50 dark:hover:bg-white/5"
            disabled={totalMatches === 0}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
