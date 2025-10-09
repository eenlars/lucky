/**
 * useKeyboardShortcuts Hook
 *
 * Manages keyboard shortcuts for chat interface
 * Provides natural, intuitive keyboard navigation
 */

import { useCallback, useEffect } from "react"

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  description: string
  action: () => void
}

export interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean
  /** Array of shortcuts to register */
  shortcuts: KeyboardShortcut[]
  /** Prevent default browser behavior */
  preventDefault?: boolean
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
  const { enabled = true, shortcuts, preventDefault = true } = options

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      for (const shortcut of shortcuts) {
        const { key, ctrl = false, shift = false, alt = false, meta = false, action } = shortcut

        // Check if all modifiers match
        const ctrlMatch = ctrl === (event.ctrlKey || event.metaKey)
        const shiftMatch = shift === event.shiftKey
        const altMatch = alt === event.altKey
        const metaMatch = meta === event.metaKey

        // Check if key matches (case-insensitive)
        const keyMatch = event.key.toLowerCase() === key.toLowerCase()

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          if (preventDefault) {
            event.preventDefault()
          }
          action()
          break
        }
      }
    },
    [enabled, shortcuts, preventDefault],
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [enabled, handleKeyDown])
}

// ============================================================================
// Common Shortcuts
// ============================================================================

export const COMMON_SHORTCUTS = {
  focusInput: (action: () => void): KeyboardShortcut => ({
    key: "k",
    meta: true,
    description: "Focus input field",
    action,
  }),

  send: (action: () => void): KeyboardShortcut => ({
    key: "Enter",
    description: "Send message",
    action,
  }),

  newLine: (action: () => void): KeyboardShortcut => ({
    key: "Enter",
    shift: true,
    description: "New line",
    action,
  }),

  clearChat: (action: () => void): KeyboardShortcut => ({
    key: "l",
    meta: true,
    shift: true,
    description: "Clear chat",
    action,
  }),

  scrollToBottom: (action: () => void): KeyboardShortcut => ({
    key: "b",
    meta: true,
    description: "Scroll to bottom",
    action,
  }),

  escape: (action: () => void): KeyboardShortcut => ({
    key: "Escape",
    description: "Cancel/Close",
    action,
  }),
}
