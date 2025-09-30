import type { VerificationErrors } from "@core/utils/validation/workflow/verify.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"

/**
 * Validates handOffType usage per node:
 * - Flags invalid casing: `handoffType` (lowercase 'o')
 * - Ensures value is one of: parallel | sequential | conditional
 * - For parallel: requires >= 2 handOffs and must not include "end"
 * - For conditional: recommends >= 2 handOffs (error if < 2)
 */
export async function verifyHandoffTypeConsistency(config: WorkflowConfig): Promise<VerificationErrors> {
  const errors: string[] = []

  for (const node of config.nodes) {
    // Invalid casing detection – catch common mistake early in JSON mode
    if (Object.prototype.hasOwnProperty.call(node as any, "handoffType")) {
      errors.push(`Node '${node.nodeId}' uses 'handoffType' (invalid key). Use 'handOffType' instead.`)
    }

    const value = (node as any).handOffType as "parallel" | "sequential" | "conditional" | undefined

    if (value === undefined) {
      continue
    }

    // Guard against arbitrary strings if bypassing schema
    if (!["parallel", "sequential", "conditional"].includes(value)) {
      errors.push(
        `Node '${node.nodeId}' has invalid handOffType '${String(
          value,
        )}'. Allowed: 'sequential' | 'parallel' | 'conditional'`,
      )
      continue
    }

    if (value === "parallel") {
      if (!node.handOffs || node.handOffs.length < 2) {
        errors.push(
          `Node '${node.nodeId}' has handOffType 'parallel' but only ${
            node.handOffs?.length ?? 0
          } handOff(s). Require at least 2.`,
        )
      }
      if (node.handOffs?.includes("end")) {
        errors.push(
          `Node '${node.nodeId}' has handOffType 'parallel' but includes 'end' in handOffs. Remove 'end' for proper parallel fan-out.`,
        )
      }
    }

    if (value === "conditional") {
      if (!node.handOffs || node.handOffs.length < 2) {
        errors.push(
          `Node '${node.nodeId}' has handOffType 'conditional' but fewer than 2 handOffs. Provide multiple targets for a decision.`,
        )
      }
    }
  }

  return errors
}
