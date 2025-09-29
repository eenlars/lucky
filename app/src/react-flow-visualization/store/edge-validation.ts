import nodesConfig, { type AppNode } from "@/react-flow-visualization/components/nodes"

export type HandleRole = "source" | "target"

/**
 * Returns true if a node type exposes more than one handle for the given role,
 * which means a specific handle id is required to disambiguate connections.
 */
export function requiresHandle(type: AppNode["type"] | undefined, role: HandleRole): boolean {
  if (!type) return false
  const handles = nodesConfig[type]?.handles || []
  const count = handles.filter((h) => h.type === role).length
  return count > 1
}
