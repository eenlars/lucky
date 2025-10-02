import type { Edge } from "@xyflow/react"

export type AppEdge = Edge<Record<string, never>, "workflow">

export function buildEdgeId(
  source: string,
  target: string,
  sourceHandle?: string | null,
  targetHandle?: string | null,
): string {
  return `${source}-${sourceHandle ?? ""}-${target}-${targetHandle ?? ""}`
}

export const createEdge = (
  source: string,
  target: string,
  sourceHandle?: string | null,
  targetHandle?: string | null,
): AppEdge => ({
  id: buildEdgeId(source, target, sourceHandle, targetHandle),
  source,
  target,
  sourceHandle: sourceHandle ?? undefined,
  targetHandle: targetHandle ?? undefined,
  type: "workflow",
  animated: true,
})
