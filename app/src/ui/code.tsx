"use client"

import { cn } from "@/lib/utils"
// Local JSON utilities
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

const extractJSON = (input: unknown): any => {
  if (typeof input === "object" && input !== null) {
    return input
  }
  if (typeof input !== "string") {
    return input
  }
  try {
    return JSON.parse(input)
  } catch {
    return input
  }
}

const showJSON = (obj: unknown, indent: number = 2): string => {
  try {
    return JSON.stringify(obj, null, indent)
  } catch {
    return String(obj)
  }
}
import { CheckIcon, ClipboardIcon } from "lucide-react"
import { useState } from "react"

export interface CodeInputProps {
  children: React.ReactNode
  block?: boolean
  className?: string
  wrap?: boolean
}

export function CodeInput({ children, block = false, className, wrap = false }: CodeInputProps) {
  const [copied, setCopied] = useState(false)
  const Component = block ? "pre" : "code"

  // Turn whatever children you got into a single string
  const rawText =
    typeof children === "string" ? children : Array.isArray(children) ? children.join("") : String(children)

  // If it's JSON/JSON5, extract & re-stringify with 2-space indent
  const displayText = isJSON(rawText) ? showJSON(extractJSON(rawText)) : rawText

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
          className,
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
          {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}
        </button>
      )}
    </div>
  )
}
