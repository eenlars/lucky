/**
 * Validation and mapping between CoreConfig and RuntimeConfig contracts.
 * Maps internal core config to the public RuntimeConfig contract.
 */

import { DEFAULT_RUNTIME_CONFIG, type RuntimeConfig } from "@lucky/shared/contracts/config"
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
      availability: coreConfig.models.availability,
      inactive: coreConfig.models.inactive,
      // Note: Model defaults removed from config, now in @lucky/models
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
    limits: {
      maxConcurrentWorkflows: coreConfig.limits.maxConcurrentWorkflows,
      maxConcurrentAIRequests: coreConfig.limits.maxConcurrentAIRequests,
      maxCostUsdPerRun: coreConfig.limits.maxCostUsdPerRun,
      enableSpendingLimits: coreConfig.limits.enableSpendingLimits,
      maxRequestsPerWindow: coreConfig.limits.maxRequestsPerWindow,
      rateWindowMs: coreConfig.limits.rateWindowMs,
      enableStallGuard: coreConfig.limits.enableStallGuard,
      enableParallelLimit: coreConfig.limits.enableParallelLimit,
    },
    context: {
      maxFilesPerWorkflow: coreConfig.limits.maxFilesPerWorkflow,
      enforceFileLimit: coreConfig.limits.enforceFileLimit,
    },
    verification: {
      allowCycles: coreConfig.verification.allowCycles,
      enableOutputValidation: coreConfig.verification.enableOutputValidation,
    },
    persistence: coreConfig.persistence,
  }
}
