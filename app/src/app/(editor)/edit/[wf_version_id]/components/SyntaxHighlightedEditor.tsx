"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"

// Dynamically import the JSON editor to avoid SSR issues
const JSONInput = dynamic(() => import("react-json-editor-ajrm"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      Loading JSON Editor...
    </div>
  ),
})

interface SyntaxHighlightedEditorProps {
  content: string
  onChange: (content: string) => void
  isLoading: boolean
}

export default function SyntaxHighlightedEditor({
  content,
  onChange,
  isLoading,
}: SyntaxHighlightedEditorProps) {
  const [error, setError] = useState<string | null>(null)
  const [displayContent, setDisplayContent] = useState<any>(null)

  // Update display content when content prop changes
  useEffect(() => {
    try {
      if (content.trim()) {
        const parsed = JSON.parse(content)
        setDisplayContent(parsed)
      } else {
        setDisplayContent({})
      }
    } catch (err) {
      setDisplayContent({})
    }
  }, [content])

  // Separate validation effect that doesn't reset content
  useEffect(() => {
    try {
      if (content.trim()) {
        const parsed = JSON.parse(content)

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
  }, [content])

  const handleChange = (result: any) => {
    if (result.jsObject !== undefined) {
      const newContent = JSON.stringify(result.jsObject, null, 2)
      onChange(newContent)
    } else if (result.plainText !== undefined) {
      onChange(result.plainText)
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
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex justify-between items-center">
        <span className="text-sm text-gray-600">
          JSON Editor with Syntax Highlighting
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-1 rounded ${error ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
          >
            {error ? "Invalid" : "Valid"}
          </span>
        </div>
      </div>

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

      {/* JSON Editor */}
      <div className="flex-1 overflow-hidden">
        <JSONInput
          key={`editor-${JSON.stringify(displayContent)}`}
          id="json-editor"
          placeholder={displayContent}
          colors={{
            default: "#000000",
            background: "#ffffff",
            string: "#cc3300",
            number: "#006600",
            colon: "#333333",
            keys: "#0066cc",
            keys_whiteSpace: "#0066cc",
            primitive: "#cc6600",
          }}
          height="100%"
          width="100%"
          onKeyPressUpdate={false}
          onChange={handleChange}
          theme="light_mitsuketa_tribute"
          style={{
            body: {
              fontSize: "14px",
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            },
            container: {
              backgroundColor: "#ffffff",
            },
            outerBox: {
              height: "100%",
              border: "none",
            },
            contentBox: {
              height: "calc(100% - 0px)",
            },
          }}
        />
      </div>
    </div>
  )
}
