"use client"

import { isMarkdownContent } from "@/features/trace-visualization/components/utils/markdown"
// Client-side JSON validation utility
const isJSON = (str: unknown): boolean => {
  try {
    if (typeof str === "object" && str !== null) {
      JSON.stringify(str)
      return true
    }
    if (typeof str === "string") {
      JSON.parse(str)
      return true
    }
    return false
  } catch {
    return false
  }
}
import dynamic from "next/dynamic"
import type { ReactJsonViewProps } from "react-json-view"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import remarkGfm from "remark-gfm"

const ReactJson = dynamic<ReactJsonViewProps>(() => import("react-json-view").then(mod => mod.default), { ssr: false })

export interface SmartContentProps {
  value: unknown
  className?: string
  collapsed?: number | boolean
  enableClipboard?: boolean
  showExpanders?: boolean
  stringifySpacing?: number
  jsonTheme?: "auto" | "monokai" | "rjv-default"
}

const getReactJsonTheme = (preferred?: "auto" | "monokai" | "rjv-default") => {
  if (preferred && preferred !== "auto") return preferred
  if (typeof window !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "monokai"
  }
  return "rjv-default"
}

function tryParseJson(input: string): unknown | null {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

export function SmartContent({
  value,
  className,
  collapsed = 1,
  enableClipboard = false,
  showExpanders = true,
  stringifySpacing = 2,
  jsonTheme = "auto",
}: SmartContentProps) {
  if (value != null && typeof value === "object") {
    if (showExpanders) {
      return (
        <div className={className}>
          <ReactJson
            src={value as any}
            theme={getReactJsonTheme(jsonTheme)}
            collapsed={collapsed as any}
            displayObjectSize={false}
            displayDataTypes={false}
            enableClipboard={enableClipboard}
            style={{ fontSize: "12px" }}
          />
        </div>
      )
    }
    return (
      <pre className={`font-mono text-xs leading-relaxed whitespace-pre-wrap ${className ?? ""}`}>
        {JSON.stringify(value, null, stringifySpacing)}
      </pre>
    )
  }

  const text = String(value ?? "").trim()

  if (isMarkdownContent(text)) {
    return (
      <div className={className}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            pre: ({ children }) => (
              <pre className="bg-gray-100 rounded-md p-2 overflow-x-auto text-[11px]">{children}</pre>
            ),
            code: ({ children, className: codeClassName }) => {
              const raw = String(children ?? "").trim()
              const isBlock = Boolean(codeClassName)
              if (!isBlock) {
                return <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">{children}</code>
              }

              const looksJson = (codeClassName && /language-json/.test(codeClassName)) || isJSON(raw)

              if (looksJson) {
                const parsed = tryParseJson(raw)
                if (parsed != null && typeof parsed === "object") {
                  if (showExpanders) {
                    return (
                      <ReactJson
                        src={parsed as any}
                        theme={getReactJsonTheme(jsonTheme)}
                        collapsed={collapsed as any}
                        displayObjectSize={false}
                        displayDataTypes={false}
                        enableClipboard={enableClipboard}
                        style={{ fontSize: "12px" }}
                      />
                    )
                  }
                  return (
                    <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
                      {JSON.stringify(parsed, null, stringifySpacing)}
                    </pre>
                  )
                }
              }

              return <code className={codeClassName}>{children}</code>
            },
            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
            h1: ({ children }) => <h1 className="text-sm font-bold mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-sm font-bold mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-xs font-bold mb-1">{children}</h3>,
            ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
            li: ({ children }) => <li className="mb-1">{children}</li>,
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    )
  }

  if (isJSON(text)) {
    const parsed = tryParseJson(text)
    if (parsed != null && typeof parsed === "object") {
      if (showExpanders) {
        return (
          <div className={className}>
            <ReactJson
              src={parsed as any}
              theme={getReactJsonTheme(jsonTheme)}
              collapsed={collapsed as any}
              displayObjectSize={false}
              displayDataTypes={false}
              enableClipboard={enableClipboard}
              style={{ fontSize: "12px" }}
            />
          </div>
        )
      }
      return (
        <pre className={`font-mono text-xs leading-relaxed whitespace-pre-wrap ${className ?? ""}`}>
          {JSON.stringify(parsed, null, stringifySpacing)}
        </pre>
      )
    }
  }

  return <div className={`${className ?? ""} whitespace-pre-wrap`}>{text}</div>
}
