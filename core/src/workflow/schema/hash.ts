import { createHash } from "crypto"

import type {
  WorkflowConfig,
  WorkflowNodeConfig,
} from "@core/workflow/schema/workflow.types"

/**
 * Stable JSON stringify that sorts object keys recursively.
 * - Preserves array order
 * - Removes undefined values (JSON default behavior)
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const sorted: Record<string, unknown> = {}
      for (const key of Object.keys(val as Record<string, unknown>).sort()) {
        sorted[key] = (val as Record<string, unknown>)[key]
      }
      return sorted
    }
    return val
  })
}

function sortUniqueStringArray(
  arr: string[] | undefined
): string[] | undefined {
  if (!arr) return arr
  const unique = Array.from(new Set(arr))
  return unique.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

/**
 * Return a sanitized copy of a node with non-hashable fields removed.
 * Currently omits `memory` by design.
 */
function sanitizeNodeForHash(
  node: WorkflowNodeConfig
): Omit<WorkflowNodeConfig, "memory"> & { memory?: never } {
  // Omit node.memory and normalize string arrays for deterministic hashing
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { memory: _omit, ...rest } = node
  // Merge waitFor/waitingFor aliases into a single normalized waitFor array
  const mergedWaitFor = [
    ...(rest.waitFor ?? []),
    ...((rest as any).waitingFor ?? []),
  ] as string[]

  const sanitized = {
    nodeId: rest.nodeId,
    description: rest.description,
    systemPrompt: rest.systemPrompt,
    modelName: rest.modelName,
    mcpTools: sortUniqueStringArray(rest.mcpTools),
    codeTools: sortUniqueStringArray(rest.codeTools),
    handOffs: sortUniqueStringArray(rest.handOffs),
    handOffType: rest.handOffType,
    waitFor: sortUniqueStringArray(mergedWaitFor),
    // intentionally drop `waitingFor` alias post-merge and any unknown fields
  }

  return sanitized as any
}

/**
 * Create a deterministic SHA-256 hash for a single workflow node.
 * - Sorts object keys
 * - Omits the node `memory`
 */
export function hashWorkflowNode(node: WorkflowNodeConfig): string {
  const sanitized = sanitizeNodeForHash(node)
  const json = stableStringify(sanitized)
  return createHash("sha256").update(json).digest("hex")
}

/**
 * Create a deterministic SHA-256 hash for a workflow.
 * - Sorts object keys
 * - Omits `memory` from each node (workflow-level memory is retained)
 */
export function hashWorkflow(config: WorkflowConfig): string {
  const sanitizedNodes = config.nodes
    .map(sanitizeNodeForHash)
    .sort((a, b) => (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0))

  const sanitized: WorkflowConfig = {
    ...config,
    nodes: sanitizedNodes as WorkflowNodeConfig[],
  }
  const json = stableStringify(sanitized)
  return createHash("sha256").update(json).digest("hex")
}

export const __internal = { stableStringify }
