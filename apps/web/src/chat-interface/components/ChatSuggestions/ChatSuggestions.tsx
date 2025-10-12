/**
 * ChatSuggestions Component
 *
 * Displays suggested prompts to guide the user
 */

"use client"

import type { ChatSuggestionsProps } from "@/chat-interface/types/types"
import { cn } from "@/lib/utils"
import { SuggestionCard } from "./SuggestionCard"

export function ChatSuggestions({ suggestions, onSelect, className }: ChatSuggestionsProps) {
  if (suggestions.length === 0) return null

  return (
    <div className={cn("grid gap-2 sm:gap-3 max-w-2xl mx-auto pt-2 sm:pt-4", className)}>
      {suggestions.map((suggestion, idx) => (
        <SuggestionCard key={idx} suggestion={suggestion} onClick={() => onSelect(suggestion)} index={idx} />
      ))}
    </div>
  )
}
