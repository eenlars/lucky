/**
 * useAutoScroll Hook
 *
 * Manages automatic scrolling behavior for chat messages
 * Inspired by natural water flow - smooth and organic
 */

import { useCallback, useEffect, useRef, useState } from "react"

export interface UseAutoScrollOptions {
  /** Whether to enable auto-scroll */
  enabled?: boolean
  /** Scroll behavior */
  behavior?: ScrollBehavior
  /** Threshold in pixels from bottom to consider "at bottom" */
  threshold?: number
  /** Whether to smooth scroll */
  smooth?: boolean
}

export interface UseAutoScrollReturn {
  /** Ref to attach to scroll container */
  scrollRef: React.RefObject<HTMLDivElement | null>
  /** Whether user is at bottom of scroll */
  isAtBottom: boolean
  /** Manually scroll to bottom */
  scrollToBottom: (options?: ScrollIntoViewOptions) => void
  /** Scroll to a specific message */
  scrollToMessage: (messageId: string) => void
}

export function useAutoScroll(
  dependencies: React.DependencyList = [],
  options: UseAutoScrollOptions = {},
): UseAutoScrollReturn {
  const { enabled = true, behavior: _behavior = "smooth", threshold = 100, smooth = true } = options

  const scrollRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const userScrolledRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Check if user is at bottom of scroll
  const checkIfAtBottom = useCallback(() => {
    if (!scrollRef.current) return false

    const container = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement
    if (!container) return false

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    return distanceFromBottom <= threshold
  }, [threshold])

  // Scroll to bottom
  const scrollToBottom = useCallback(
    (scrollOptions?: ScrollIntoViewOptions) => {
      if (!scrollRef.current) return

      const container = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement
      if (!container) return

      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
        ...scrollOptions,
      })

      // Reset user scrolled flag after auto-scroll
      userScrolledRef.current = false
    },
    [smooth],
  )

  // Scroll to specific message
  const scrollToMessage = useCallback(
    (messageId: string) => {
      const messageElement = document.getElementById(messageId)
      if (!messageElement) return

      messageElement.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "center",
      })
    },
    [smooth],
  )

  // Handle scroll events
  useEffect(() => {
    if (!scrollRef.current) return

    const container = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement
    if (!container) return

    const handleScroll = () => {
      const atBottom = checkIfAtBottom()
      setIsAtBottom(atBottom)

      // If user manually scrolled up, mark it
      if (!atBottom) {
        userScrolledRef.current = true
      }

      // Clear any pending auto-scroll
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
  }, [checkIfAtBottom])

  // Auto-scroll when dependencies change (new messages)
  useEffect(() => {
    if (!enabled) return
    if (userScrolledRef.current && !isAtBottom) return // User scrolled up, don't auto-scroll

    // Delay scroll slightly to let DOM update
    scrollTimeoutRef.current = setTimeout(() => {
      scrollToBottom()
    }, 50)

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [...dependencies, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    scrollRef,
    isAtBottom,
    scrollToBottom,
    scrollToMessage,
  }
}
