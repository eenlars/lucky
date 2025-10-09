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
    <div className={cn("flex justify-start px-2 sm:px-0 animate-in fade-in duration-300", className)}>
      <div className="bg-black/5 text-black border border-black/10 rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 shadow-sm">
        <div className="flex gap-1.5 items-center">
          <span
            className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-black/40 rounded-full animate-bounce"
            style={{ animationDelay: "0ms", animationDuration: "1s" }}
          />
          <span
            className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-black/40 rounded-full animate-bounce"
            style={{ animationDelay: "150ms", animationDuration: "1s" }}
          />
          <span
            className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-black/40 rounded-full animate-bounce"
            style={{ animationDelay: "300ms", animationDuration: "1s" }}
          />
        </div>
      </div>
    </div>
  )
}
