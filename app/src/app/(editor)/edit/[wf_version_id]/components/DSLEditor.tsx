"use client"

import { useState, useEffect } from "react"

interface DSLEditorProps {
  content: string
  onChange: (content: string) => void
  isLoading: boolean
}

export default function DSLEditor({
  content,
  onChange,
  isLoading,
}: DSLEditorProps) {
  const [error, setError] = useState<string | null>(null)
  const [lineCount, setLineCount] = useState(1)

  // Update line count when content changes
  useEffect(() => {
    const lines = content.split("\n").length
    setLineCount(lines)
  }, [content])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    onChange(newContent)

    // Enhanced JSON validation
    try {
      if (newContent.trim()) {
        const parsed = JSON.parse(newContent)

        // Basic workflow structure validation
        if (typeof parsed === "object" && parsed !== null) {
          if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
            setError("Workflow must contain a 'nodes' array")
          } else if (parsed.nodes.length === 0) {
            setError("Workflow must contain at least one node")
          } else {
            setError(null)
          }
        } else {
          setError("Workflow must be a valid JSON object")
        }
      } else {
        setError(null)
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Invalid JSON format"
      setError(`JSON Error: ${errorMessage}`)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Loading workflow...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {error && (
        <div className="bg-red-50 border-b border-red-200 p-2">
          <div className="text-red-700 text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        </div>
      )}

      <div className="flex-1 flex">
        {/* Line numbers */}
        <div className="bg-gray-50 border-r border-gray-200 p-4 pr-2 select-none text-right font-mono text-sm text-gray-500 min-w-[3rem] overflow-y-auto">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} className="leading-5">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Editor */}
        <textarea
          value={content}
          onChange={handleChange}
          className="flex-1 p-4 font-mono text-sm border-none resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 leading-5 overflow-y-auto"
          placeholder="Enter workflow DSL JSON..."
          style={{ height: "100%" }}
          spellCheck={false}
        />
      </div>

      {/* Status bar */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-xs text-gray-500 flex justify-between">
        <span>Lines: {lineCount}</span>
        <span>JSON: {error ? "Invalid" : "Valid"}</span>
      </div>
    </div>
  )
}
