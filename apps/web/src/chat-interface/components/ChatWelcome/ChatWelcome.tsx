/**
 * ChatWelcome Component
 *
 * The entrance - creates the first impression
 */

"use client"

import type { ChatWelcomeProps } from "@/chat-interface/types/types"
import { cn } from "@/lib/utils"

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
        <h2 className="text-lg sm:text-xl font-light text-chat-foreground/80">{title}</h2>
        <p className="text-xs sm:text-sm font-light text-chat-muted px-4 max-w-md mx-auto">{subtitle}</p>
      </div>

      {/* Keyboard hint */}
      <p className="text-xs font-light text-chat-muted/75 pt-2">
        Press{" "}
        <kbd className="px-1.5 py-0.5 bg-chat-accent border border-chat-border rounded text-[10px] font-mono">⌘K</kbd>{" "}
        to focus
      </p>
    </div>
  )
}
