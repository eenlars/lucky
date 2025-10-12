/**
 * ChatInput Component
 *
 * Main input component with auto-expanding textarea and send button
 * The portal through which user thoughts flow into the system
 */

"use client"

import type { ChatInputProps } from "@/chat-interface/types/types"
import { cn } from "@/lib/utils"
import { useEffect, useRef } from "react"
import { InputToolbar } from "./InputToolbar"
import { SendButton } from "./SendButton"

export function ChatInput({
  value,
  onChange,
  onSend,
  onKeyDown,
  placeholder = "Type a message...",
  disabled = false,
  isLoading = false,
  maxLength = 10000,
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevValueRef = useRef(value)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = "auto"
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [value])

  // Auto-focus after sending (when value goes from non-empty to empty)
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const wasNonEmpty = prevValueRef.current.length > 0
    const isNowEmpty = value === ""

    if (wasNonEmpty && isNowEmpty) {
      // Use setTimeout to ensure focus happens after React update
      setTimeout(() => textarea.focus(), 0)
    }

    prevValueRef.current = value
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled && !isLoading) {
        onSend()
      }
    }

    onKeyDown?.(e)
  }

  const handleSend = () => {
    if (value.trim() && !disabled && !isLoading) {
      onSend()
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex gap-2 sm:gap-3 items-end">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            data-chat-input
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            maxLength={maxLength}
            className={cn(
              "w-full px-3 py-2.5 sm:px-4 sm:py-3",
              "border border-chat-border rounded-2xl",
              "resize-none overflow-y-auto",
              "focus:outline-none focus:border-chat-foreground/40",
              "transition-all",
              "text-sm font-light",
              "placeholder:text-chat-muted",
              "bg-chat-background text-chat-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isLoading && "animate-pulse",
            )}
            rows={1}
            style={{
              minHeight: "44px",
              maxHeight: "200px",
              transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
              transitionDuration: "200ms",
            }}
          />

          {/* Character count (when approaching limit) */}
          {value.length > maxLength * 0.8 && (
            <div className="absolute bottom-2.5 right-3 sm:bottom-3 text-xs text-chat-muted">
              {value.length}/{maxLength}
            </div>
          )}
        </div>

        {/* Send button */}
        <SendButton onClick={handleSend} disabled={!value.trim() || disabled || isLoading} isLoading={isLoading} />
      </div>

      {/* Toolbar */}
      <InputToolbar
        disabled={disabled || isLoading}
        onAttach={() => console.log("Attach clicked")}
        onVoice={() => console.log("Voice clicked")}
        onAudio={() => console.log("Audio clicked")}
      />
    </div>
  )
}
