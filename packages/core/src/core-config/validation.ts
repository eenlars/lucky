/**
 * Validation helpers for converting CoreConfig to contract schemas
 */

import type { RuntimeConfig } from "@lucky/contracts/runtime"
import type { CoreConfig } from "./types"

/**
 * Convert CoreConfig to RuntimeConfig contract format.
 * Extracts only the runtime-relevant configuration.
 */
export function toRuntimeContract(config: CoreConfig): RuntimeConfig {
  return {
    coordinationType: config.coordinationType,
    newNodeProbability: config.newNodeProbability,
    logging: config.logging,
    tools: {
      inactive: Array.from(config.tools.inactive),
      uniqueToolsPerAgent: config.tools.uniqueToolsPerAgent,
      uniqueToolSetsPerAgent: config.tools.uniqueToolSetsPerAgent,
      maxToolsPerAgent: config.tools.maxToolsPerAgent,
      maxStepsVercel: config.tools.maxStepsVercel,
      defaultTools: Array.from(config.tools.defaultTools),
      autoSelectTools: config.tools.autoSelectTools,
      usePrepareStepStrategy: config.tools.usePrepareStepStrategy,
      experimentalMultiStepLoop: config.tools.experimentalMultiStepLoop,
      showParameterSchemas: config.tools.showParameterSchemas,
      experimentalMultiStepLoopMaxRounds: config.tools.experimentalMultiStepLoopMaxRounds,
    },
    workflow: {
      maxTotalNodeInvocations: config.workflow.maxTotalNodeInvocations,
      maxPerNodeInvocations: config.workflow.maxPerNodeInvocations,
      maxNodes: config.workflow.maxNodes,
      handoffContent: config.workflow.handoffContent,
      prepareProblem: config.workflow.prepareProblem,
      prepareProblemMethod: config.workflow.prepareProblemMethod,
      prepareProblemWorkflowVersionId: config.workflow.prepareProblemWorkflowVersionId,
      parallelExecution: config.workflow.parallelExecution,
    },
    improvement: config.improvement,
    limits: config.limits,
    context: config.context,
    verification: config.verification,
    persistence: config.persistence,
  }
}
