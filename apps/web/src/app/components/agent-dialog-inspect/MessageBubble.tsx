"use client"

import { cn } from "@/lib/utils"

interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
}

/**
 * MessageBubble - Minimal message bubble component
 *
 * Simple, reusable message display without timestamps, actions, or animations.
 * Follows the agent inspector design pattern.
 */
export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user"

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] px-3.5 py-2.5 rounded-lg text-sm",
          isUser
            ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
        )}
      >
        <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
      </div>
    </div>
  )
}
