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

export function SuggestionCard({ suggestion, onClick, index: _index = 0 }: SuggestionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group text-left p-4",
        "border border-black/10 rounded-lg",
        "hover:border-black/20 hover:bg-black/[0.02]",
        "transition-all duration-200",
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-light text-black/70 group-hover:text-black transition-colors">{suggestion}</span>
        <span className="text-black/30 group-hover:text-black/50 transition-colors shrink-0">→</span>
      </div>
    </button>
  )
}
