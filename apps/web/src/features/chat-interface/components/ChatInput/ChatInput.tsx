/**
 * ChatInput Component
 *
 * Main input component with auto-expanding textarea and send button
 * The portal through which user thoughts flow into the system
 */

"use client"

import { cn } from "@/lib/utils"
import { useEffect, useRef } from "react"
import { InputToolbar } from "./InputToolbar"
import { SendButton } from "./SendButton"

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
  maxLength?: number
  className?: string
}

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
    <div
      className={cn(
        "flex flex-col bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg",
        className,
      )}
    >
      {/* Textarea */}
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
          "flex-1 bg-transparent text-gray-900 dark:text-gray-100",
          "placeholder:text-gray-400 dark:placeholder:text-gray-500",
          "text-[15px] leading-[22px]",
          "resize-none outline-none focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2",
          "disabled:opacity-50",
          "px-5 pt-4 pb-1",
          isLoading && "animate-pulse",
        )}
        rows={3}
        style={{
          minHeight: "80px",
          maxHeight: "200px",
        }}
      />

      {/* Character count (when approaching limit) */}
      {value.length > maxLength * 0.8 && (
        <div className="px-5 pb-1 text-xs text-gray-400 dark:text-gray-500">
          {value.length}/{maxLength}
        </div>
      )}

      {/* Bottom toolbar and send button */}
      <div className="flex items-center justify-between px-4 pb-4 pt-1">
        <InputToolbar
          disabled={disabled || isLoading}
          onAttach={() => console.log("Attach clicked")}
          onVoice={() => console.log("Voice clicked")}
          onAudio={() => console.log("Audio clicked")}
        />

        <SendButton onClick={handleSend} disabled={!value.trim() || disabled || isLoading} isLoading={isLoading} />
      </div>
    </div>
  )
}
