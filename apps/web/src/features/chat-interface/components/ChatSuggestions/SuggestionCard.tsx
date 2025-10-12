/**
 * SuggestionCard Component
 *
 * Individual suggestion card with hover effects
 */

"use client"

import { getStaggerStyle } from "@/features/chat-interface/utils/animation-utils"
import { cn } from "@/lib/utils"

interface SuggestionCardProps {
  suggestion: string
  onClick: () => void
  index?: number
}

export function SuggestionCard({ suggestion, onClick, index = 0 }: SuggestionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group text-left p-3 sm:p-4",
        "border border-black/10 rounded-xl",
        "hover:border-black/30 hover:bg-black/[0.02] hover:shadow-sm",
        "transition-all duration-200",
        "active:scale-[0.98]",
        "animate-in fade-in slide-in-from-bottom-2 duration-400",
      )}
      style={getStaggerStyle(index, 50)}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs sm:text-sm font-light text-black/70 group-hover:text-black transition-colors">
          {suggestion}
        </span>
        <span className="text-black/30 group-hover:text-black/50 group-hover:translate-x-0.5 transition-all shrink-0">
          →
        </span>
      </div>
    </button>
  )
}
