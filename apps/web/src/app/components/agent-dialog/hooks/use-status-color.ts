import type { WorkflowNodeData } from "@/features/react-flow-visualization/components/nodes/nodes"
import { useMemo } from "react"

const STATUS_COLOR_MAP = {
  initial: "bg-gray-400",
  success: "bg-green-500",
  loading: "bg-blue-500",
  error: "bg-red-500",
} as const

/**
 * Memoized status color lookup
 * Prevents recomputing on every render
 */
export function useStatusColor(status?: WorkflowNodeData["status"]) {
  return useMemo(() => {
    if (!status || status === "initial") return STATUS_COLOR_MAP.initial
    return STATUS_COLOR_MAP[status] || STATUS_COLOR_MAP.initial
  }, [status])
}
