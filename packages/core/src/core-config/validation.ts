/**
 * Validation helpers for converting CoreConfig to contract schemas
 */

import type { RuntimeConfig } from "@lucky/contracts/runtime"
import type { CoreConfig } from "./types"

/**
 * Convert CoreConfig to RuntimeConfig contract format.
 * Extracts only the runtime-relevant configuration (excludes paths and evolution).
 */
export function toRuntimeContract(config: CoreConfig): RuntimeConfig {
  return {
    coordinationType: config.coordinationType,
    newNodeProbability: config.newNodeProbability,
    models: config.models,
    logging: config.logging,
    tools: config.tools,
    workflow: config.workflow,
    improvement: config.improvement,
    limits: config.limits,
    context: config.context,
    verification: config.verification,
    persistence: config.persistence,
  }
}
