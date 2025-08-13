import { type Edge } from "@xyflow/react"

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type AppEdge = Edge<{}, "workflow">

export function buildEdgeId(
  source: string,
  target: string,
  sourceHandle?: string | null,
  targetHandle?: string | null
): string {
  return `${source}-${sourceHandle ?? ""}-${target}-${targetHandle ?? ""}`
}

export const createEdge = (
  source: string,
  target: string,
  sourceHandle?: string | null,
  targetHandle?: string | null
): AppEdge => ({
  id: buildEdgeId(source, target, sourceHandle, targetHandle),
  source,
  target,
  sourceHandle: sourceHandle ?? undefined,
  targetHandle: targetHandle ?? undefined,
  type: "workflow",
  animated: true,
})
