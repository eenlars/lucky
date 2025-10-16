"use client"

import { cn } from "@/lib/utils"
import { useState } from "react"

interface MessageBubbleProps {
  id: string
  role: "user" | "assistant"
  content: string
  onCopy?: (id: string, content: string) => void
  onDelete?: (id: string) => void
}

export function MessageBubble({ id, role, content, onCopy, onDelete }: MessageBubbleProps) {
  const isUser = role === "user"
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (onCopy) {
      onCopy(id, content)
    } else {
      await navigator.clipboard.writeText(content)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(id)
    }
  }

  return (
    <div className={cn("flex group", isUser ? "justify-end" : "justify-start")}>
      <div className="flex flex-col gap-1">
        <div
          className={cn(
            "px-2.5 py-1.5 rounded-lg text-sm leading-relaxed",
            isUser
              ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
              : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
          )}
        >
          <div className="whitespace-pre-wrap">{content}</div>
        </div>

        <div
          className={cn(
            "flex gap-2.5 text-[11px] tracking-tight",
            "opacity-0 group-hover:opacity-100",
            "motion-safe:transition-opacity motion-safe:duration-150",
            "motion-reduce:transition-none motion-reduce:opacity-100",
            isUser ? "justify-end" : "justify-start",
          )}
        >
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "px-2 py-2.5",
              "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              "motion-safe:transition-colors motion-safe:duration-150",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              "focus-visible:outline-gray-400 dark:focus-visible:outline-gray-500",
            )}
            aria-label="Copy message"
            aria-live="polite"
          >
            {copied ? "copied" : "copy"}
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className={cn(
                "px-2 py-2.5",
                "text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400",
                "motion-safe:transition-colors motion-safe:duration-150",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                "focus-visible:outline-red-400 dark:focus-visible:outline-red-500",
              )}
              aria-label="Delete message"
            >
              delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
