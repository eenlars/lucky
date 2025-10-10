/**
 * Validation helpers for converting CoreConfig to contract schemas
 */

import type { RuntimeConfig } from "@lucky/shared/contracts/runtime"
import type { CoreConfig } from "./types"

/**
 * Convert CoreConfig to RuntimeConfig contract format.
 * Extracts only the runtime-relevant configuration (excludes paths and evolution).
 */
export function toRuntimeContract(config: CoreConfig): RuntimeConfig {
  // Use type assertion to avoid deep type instantiation issues
  // CoreConfig uses AnyModelName (large union type) while RuntimeConfig uses string
  return {
    coordinationType: config.coordinationType,
    newNodeProbability: config.newNodeProbability,
    models: config.models as RuntimeConfig["models"],
    logging: config.logging,
    tools: config.tools,
    workflow: config.workflow,
    improvement: config.improvement,
    limits: config.limits,
    verification: config.verification,
    persistence: config.persistence,
  }
}
