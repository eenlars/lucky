/**
 * InputToolbar Component
 *
 * Toolbar below the input with actions and mode controls
 * Inspired by modern chat interfaces
 */

"use client"

import { cn } from "@/lib/utils"
import { AudioWaveform, Mic, Plus } from "lucide-react"

interface InputToolbarProps {
  onAttach?: () => void
  onVoice?: () => void
  onAudio?: () => void
  disabled?: boolean
}

export function InputToolbar({ onAttach, onVoice, onAudio, disabled: _disabled = false }: InputToolbarProps) {
  return (
    <div className="flex items-center gap-2 pt-2">
      {/* Attach button */}
      <button
        type="button"
        onClick={onAttach}
        disabled={true}
        className={cn(
          "p-2.5 sm:p-1.5 rounded-lg",
          "text-chat-muted hover:text-chat-foreground hover:bg-chat-accent",
          "transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
        style={{
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          transitionDuration: "200ms",
        }}
        aria-label="Attach file"
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Voice button */}
      <button
        type="button"
        onClick={onVoice}
        disabled={true}
        className={cn(
          "p-2.5 sm:p-1.5 rounded-lg",
          "text-chat-muted hover:text-chat-foreground hover:bg-chat-accent",
          "transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
        style={{
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          transitionDuration: "200ms",
        }}
        aria-label="Voice input"
      >
        <Mic className="w-4 h-4" />
      </button>

      {/* Audio waveform button */}
      <button
        type="button"
        onClick={onAudio}
        disabled={true}
        className={cn(
          "p-2.5 sm:p-1.5 rounded-lg",
          "text-chat-muted hover:text-chat-foreground hover:bg-chat-accent",
          "transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
        style={{
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          transitionDuration: "200ms",
        }}
        aria-label="Audio input"
      >
        <AudioWaveform className="w-4 h-4" />
      </button>
    </div>
  )
}
