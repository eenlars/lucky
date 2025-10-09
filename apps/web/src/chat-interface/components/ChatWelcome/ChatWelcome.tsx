/**
 * ChatWelcome Component
 *
 * The entrance - creates the first impression
 */

"use client"

import { cn } from "@/lib/utils"
import type { ChatWelcomeProps } from "../../types"

export function ChatWelcome({
  title = "Start a conversation",
  subtitle = "Ask about workflows, get help creating them, or explore what's possible",
  icon = "💬",
  className,
}: ChatWelcomeProps) {
  return (
    <div className={cn("text-center py-8 sm:py-12 space-y-6 sm:space-y-8 px-4", className)}>
      {/* Icon */}
      <div className="text-5xl sm:text-6xl mb-4 animate-in fade-in duration-700">{icon}</div>

      {/* Text */}
      <div className="space-y-2">
        <h2 className="text-lg sm:text-xl font-light text-black/80">{title}</h2>
        <p className="text-xs sm:text-sm font-light text-black/50 px-4 max-w-md mx-auto">{subtitle}</p>
      </div>

      {/* Keyboard hint */}
      <p className="text-xs font-light text-black/30 pt-2">
        Press <kbd className="px-1.5 py-0.5 bg-black/5 border border-black/10 rounded text-[10px] font-mono">⌘K</kbd> to
        focus
      </p>
    </div>
  )
}
