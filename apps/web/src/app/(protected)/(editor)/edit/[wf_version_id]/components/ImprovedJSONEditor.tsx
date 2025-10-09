"use client"

import { json } from "@codemirror/lang-json"
import { type Diagnostic, linter } from "@codemirror/lint"
import { EditorView } from "@codemirror/view"
import CodeMirror from "@uiw/react-codemirror"
import { useCallback, useState } from "react"

interface ImprovedJSONEditorProps {
  content: string
  onChange: (content: string) => void
  isLoading: boolean
}

export default function ImprovedJSONEditor({ content, onChange, isLoading }: ImprovedJSONEditorProps) {
  const [error, setError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  // json linter
  const jsonLinter = linter(view => {
    const diagnostics: Diagnostic[] = []
    const doc = view.state.doc.toString()

    try {
      if (doc.trim()) {
        const parsed = JSON.parse(doc)

        // basic workflow structure validation
        if (typeof parsed === "object" && parsed !== null) {
          if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
            diagnostics.push({
              from: 0,
              to: doc.length,
              severity: "error",
              message: "Workflow must contain a 'nodes' array",
            })
          } else if (parsed.nodes.length === 0) {
            diagnostics.push({
              from: 0,
              to: doc.length,
              severity: "warning",
              message: "Workflow must contain at least one node",
            })
          }
        } else {
          diagnostics.push({
            from: 0,
            to: doc.length,
            severity: "error",
            message: "Workflow must be a valid JSON object",
          })
        }
        setError(null)
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Invalid JSON"

      // try to find the position of the error
      const match = errorMessage.match(/position (\d+)/)
      const position = match ? Number.parseInt(match[1]) : 0

      diagnostics.push({
        from: position,
        to: Math.min(position + 1, doc.length),
        severity: "error",
        message: errorMessage,
      })
      setError(errorMessage)
    }

    return diagnostics
  })

  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(content)
      const formatted = JSON.stringify(parsed, null, 2)
      onChange(formatted)
    } catch (_e) {
      // if invalid json, do nothing
    }
  }, [content, onChange])

  const handleCopy = useCallback(async () => {
    try {
      // parse and stringify to ensure valid json format
      const parsed = JSON.parse(content)
      const validJson = JSON.stringify(parsed, null, 2)

      await navigator.clipboard.writeText(validJson)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (_e) {
      // if invalid json, copy as is
      await navigator.clipboard.writeText(content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }, [content])

  // keyboard shortcuts
  const extensions = [
    json(),
    jsonLinter,
    EditorView.theme({
      "&": {
        fontSize: "14px",
        height: "100%",
      },
      ".cm-content": {
        fontFamily: '"SF Mono", Monaco, Consolas, "Courier New", monospace',
        padding: "12px",
      },
      ".cm-focused": {
        outline: "none",
      },
      ".cm-line": {
        paddingLeft: "8px",
        paddingRight: "8px",
      },
      ".cm-gutters": {
        backgroundColor: "#f9fafb",
        borderRight: "1px solid #e5e7eb",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "#e5e7eb",
      },
      ".cm-tooltip-lint": {
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      },
    }),
    EditorView.lineWrapping,
  ]

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Loading workflow...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex justify-between items-center">
        <span className="text-sm text-gray-600 font-medium">JSON Editor</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFormat}
            className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors cursor-pointer"
            title="Format JSON (Cmd/Ctrl+Shift+F)"
          >
            Format
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Copy JSON"
          >
            {isCopied ? (
              <>
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </>
            )}
          </button>
          <span
            className={`text-xs px-2 py-1 rounded ${error ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
          >
            {error ? "Invalid" : "Valid"}
          </span>
        </div>
      </div>

      {/* editor */}
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={content}
          height="100%"
          extensions={extensions}
          onChange={value => onChange(value)}
          onKeyDown={e => {
            // format shortcut
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
              e.preventDefault()
              handleFormat()
            }
            // copy shortcut
            if ((e.metaKey || e.ctrlKey) && e.key === "c" && !window.getSelection()?.toString()) {
              e.preventDefault()
              handleCopy()
            }
          }}
          theme="light"
          placeholder='{\n  "nodes": [],\n  "edges": []\n}'
        />
      </div>
    </div>
  )
}
