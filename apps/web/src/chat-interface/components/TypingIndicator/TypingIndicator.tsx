/**
 * TypingIndicator Component
 *
 * The pulse - indicates assistant is thinking
 * Inspired by nature's rhythms
 */

"use client"

import { cn } from "@/lib/utils"

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex justify-start animate-in fade-in duration-300", className)}>
      <div className="bg-chat-accent text-chat-foreground border border-chat-border rounded-2xl px-4 py-3">
        <div className="flex gap-1.5 items-center">
          <span
            className="w-2 h-2 bg-chat-muted rounded-full animate-bounce"
            style={{ animationDelay: "0ms", animationDuration: "1s" }}
          />
          <span
            className="w-2 h-2 bg-chat-muted rounded-full animate-bounce"
            style={{ animationDelay: "150ms", animationDuration: "1s" }}
          />
          <span
            className="w-2 h-2 bg-chat-muted rounded-full animate-bounce"
            style={{ animationDelay: "300ms", animationDuration: "1s" }}
          />
        </div>
      </div>
    </div>
  )
}
