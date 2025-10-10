/**
 * Validation and mapping between CoreConfig and RuntimeConfig contracts.
 * Maps internal core config to the public RuntimeConfig contract.
 */

import { DEFAULT_RUNTIME_CONFIG, type RuntimeConfig } from "@lucky/contracts/config"
import type { CoreConfig } from "./types"

/**
 * Convert CoreConfig to RuntimeConfig contract format.
 * Validates structure and ensures compatibility with contract schema.
 */
export function toRuntimeContract(coreConfig: CoreConfig): RuntimeConfig {
  return {
    coordinationType: coreConfig.coordinationType,
    newNodeProbability: coreConfig.newNodeProbability,
    models: {
      provider: coreConfig.models.provider,
      inactive: coreConfig.models.inactive,
      defaults: coreConfig.models.defaults,
    },
    logging: coreConfig.logging,
    tools: {
      inactive: coreConfig.tools.inactive,
      defaultTools: coreConfig.tools.defaultTools,
      uniqueToolsPerAgent: coreConfig.tools.uniqueToolsPerAgent,
      uniqueToolSetsPerAgent: coreConfig.tools.uniqueToolSetsPerAgent,
      maxToolsPerAgent: coreConfig.tools.maxToolsPerAgent,
      maxStepsVercel: coreConfig.tools.maxStepsVercel,
      autoSelectTools: coreConfig.tools.autoSelectTools,
      usePrepareStepStrategy: coreConfig.tools.usePrepareStepStrategy,
      experimentalMultiStepLoop: coreConfig.tools.experimentalMultiStepLoop,
      showParameterSchemas: coreConfig.tools.showParameterSchemas,
      experimentalMultiStepLoopMaxRounds: coreConfig.tools.experimentalMultiStepLoopMaxRounds,
    },
    workflow: {
      maxTotalNodeInvocations: coreConfig.workflow.maxTotalNodeInvocations,
      maxPerNodeInvocations:
        coreConfig.workflow.maxPerNodeInvocations ?? DEFAULT_RUNTIME_CONFIG.workflow.maxPerNodeInvocations!,
      maxNodes: coreConfig.workflow.maxNodes,
      handoffContent: coreConfig.workflow.handoffContent,
      prepareProblem: coreConfig.workflow.prepareProblem,
      prepareProblemMethod: coreConfig.workflow.prepareProblemMethod,
      prepareProblemWorkflowVersionId: coreConfig.workflow.prepareProblemWorkflowVersionId,
      parallelExecution: coreConfig.workflow.parallelExecution,
    },
    evolution: coreConfig.evolution,
    improvement: coreConfig.improvement,
    limits: coreConfig.limits,
    context: coreConfig.context,
    verification: coreConfig.verification,
    persistence: coreConfig.persistence,
  }
}
