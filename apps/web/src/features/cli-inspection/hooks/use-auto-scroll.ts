import { useEffect, useRef, useState } from "react"

export interface AutoScrollState {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  autoScroll: boolean
  newLogCount: number
  setAutoScroll: (enabled: boolean) => void
  handleScroll: () => void
}

/**
 * React hook for managing auto-scroll behavior in log panel.
 * Handles:
 * - Auto-scrolling to bottom when new logs arrive
 * - Pausing auto-scroll when user scrolls up
 * - Tracking new log count while paused
 * - Resuming auto-scroll when user scrolls back to bottom
 */
export function useAutoScroll(logCount: number, isSearchActive: boolean): AutoScrollState {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [newLogCount, setNewLogCount] = useState(0)
  const prevScrollHeight = useRef(0)

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    if (autoScroll && !isSearchActive) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      })
      prevScrollHeight.current = container.scrollHeight
      setNewLogCount(0)
    } else if (!autoScroll) {
      const heightDiff = container.scrollHeight - prevScrollHeight.current
      if (heightDiff > 0) {
        setNewLogCount(prev => prev + 1)
      }
      prevScrollHeight.current = container.scrollHeight
    }
  }, [logCount, autoScroll, isSearchActive])

  // Detect manual scroll and toggle auto-scroll
  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return

    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50
    setAutoScroll(isAtBottom)

    if (isAtBottom) {
      setNewLogCount(0)
    }
  }

  return {
    scrollContainerRef,
    autoScroll,
    newLogCount,
    setAutoScroll,
    handleScroll,
  }
}
