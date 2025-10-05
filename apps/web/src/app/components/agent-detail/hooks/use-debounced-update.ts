import { useCallback, useEffect, useRef } from "react"

/**
 * Shared hook for debounced node updates
 * Fixes memory leak by properly cleaning up timeouts when dependencies change
 */
export function useDebouncedUpdate(
  nodeId: string,
  updateNode: (nodeId: string, updates: Record<string, any>) => void,
  delay = 500,
) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Cleanup on unmount OR when nodeId/updateNode changes
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [nodeId, updateNode])

  const debouncedUpdate = useCallback(
    (updates: Record<string, any>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        updateNode(nodeId, updates)
      }, delay)
    },
    [nodeId, updateNode, delay],
  )

  return debouncedUpdate
}
