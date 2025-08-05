"use client"

import { cn } from "@/lib/utils"
import { JSONN } from "@shared/utils/files/json/jsonParse"
import { CheckIcon, ClipboardIcon } from "lucide-react"
import { useState } from "react"

export interface CodeInputProps {
  children: React.ReactNode
  block?: boolean
  className?: string
  wrap?: boolean
}

export function CodeInput({
  children,
  block = false,
  className,
  wrap = false,
}: CodeInputProps) {
  const [copied, setCopied] = useState(false)
  const Component = block ? "pre" : "code"

  // Turn whatever children you got into a single string
  const rawText =
    typeof children === "string"
      ? children
      : Array.isArray(children)
        ? children.join("")
        : String(children)

  // If it's JSON/JSON5, extract & re-stringify with 2-space indent
  const displayText = JSONN.isJSON(rawText)
    ? JSONN.show(JSONN.extract(rawText))
    : rawText

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className={cn("relative group", block && "mt-2")}>
      <Component
        className={cn(
          "font-mono text-sm",
          block && "p-4 rounded-md bg-muted overflow-x-auto",
          wrap && "whitespace-pre-wrap break-words",
          !wrap && "whitespace-pre",
          className
        )}
      >
        {displayText}
      </Component>
      {block && (
        <button
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition p-1 rounded bg-muted hover:bg-muted/80"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {copied ? (
            <CheckIcon className="w-4 h-4 text-green-500" />
          ) : (
            <ClipboardIcon className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  )
}
