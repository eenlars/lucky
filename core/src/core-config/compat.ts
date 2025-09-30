/**
 * Compatibility layer for gradual migration from @runtime to core-config.
 *
 * MIGRATION STRATEGY:
 * Phase 1: This file imports from @runtime and re-exports (NO BEHAVIOR CHANGE) ✅
 * Phase 2: Update all imports to use this file instead of @runtime ✅
 * Phase 3: Switch this file to use local config (BEHAVIOR CHANGE) ← WE ARE HERE
 * Phase 4: Clean up and remove @runtime dependency
 *
 * Current Phase: 3 (using local config)
 */

import { getCoreConfig, getDefaultModels as coreGetDefaultModels } from "./index"
import type { CoreConfig } from "./types"
import type { FlowRuntimeConfig, FlowPathsConfig } from "@core/types"
import type { EvolutionSettings } from "@core/improvement/gp/resources/evolution-types"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"

// Map core config to legacy runtime config format
export const CONFIG: FlowRuntimeConfig = mapCoreConfigToLegacy(getCoreConfig())
export const PATHS: FlowPathsConfig = getCoreConfig().paths
export const MODELS = getCoreConfig().models.defaults
export const getDefaultModels = coreGetDefaultModels

// Additional exports for backward compatibility
export const TOOLS = { ...CONFIG.tools, mcp: {} as Record<string, string>, code: {} as Record<string, string> }

/**
 * Create evolution settings with optional overrides.
 * Maps to core's evolution config.
 */
export function createEvolutionSettingsWithConfig(overrides?: Partial<EvolutionSettings>): EvolutionSettings {
  const coreConfig = getCoreConfig()
  const defaults: EvolutionSettings = {
    mode: "GP",
    populationSize: coreConfig.evolution.GP.populationSize,
    generations: coreConfig.evolution.GP.generations,
    tournamentSize: 5,
    eliteSize: 2,
    maxEvaluationsPerHour: 300,
    maxCostUSD: coreConfig.limits.maxCostUsdPerRun,
    evaluationDataset: "",
    baselineComparison: false,
    mutationParams: {
      mutationInstructions: "Apply semantic mutations to improve workflow performance",
    },
    crossoverRate: 0.7,
    mutationRate: 0.3,
    offspringCount: 2,
    numberOfParentsCreatingOffspring: 2,
  }
  return { ...defaults, ...overrides }
}

/**
 * Selected question for evaluation inputs.
 * For standalone mode, return a default evaluation input.
 */
export const SELECTED_QUESTION: EvaluationInput = {
  type: "text",
  question: "Default question for standalone mode",
  answer: "Default answer",
  goal: "Default goal",
  workflowId: "wf-default",
}

function mapCoreConfigToLegacy(coreConfig: CoreConfig): FlowRuntimeConfig {
  return {
    coordinationType: coreConfig.coordinationType,
    newNodeProbability: coreConfig.newNodeProbability,
    logging: coreConfig.logging,
    workflow: {
      parallelExecution: coreConfig.workflow.parallelExecution,
      asyncExecution: false, // deprecated, always false
      maxTotalNodeInvocations: coreConfig.workflow.maxTotalNodeInvocations,
      maxPerNodeInvocations: coreConfig.workflow.maxPerNodeInvocations,
      maxNodes: coreConfig.workflow.maxNodes,
      handoffContent: coreConfig.workflow.handoffContent,
      prepareProblem: coreConfig.workflow.prepareProblem,
      prepareProblemMethod: coreConfig.workflow.prepareProblemMethod,
      prepareProblemWorkflowVersionId: coreConfig.workflow.prepareProblemWorkflowVersionId,
    },
    tools: {
      inactive: coreConfig.tools.inactive,
      uniqueToolsPerAgent: coreConfig.tools.uniqueToolsPerAgent,
      uniqueToolSetsPerAgent: coreConfig.tools.uniqueToolSetsPerAgent,
      maxToolsPerAgent: coreConfig.tools.maxToolsPerAgent,
      maxStepsVercel: coreConfig.tools.maxStepsVercel,
      defaultTools: coreConfig.tools.defaultTools,
      autoSelectTools: coreConfig.tools.autoSelectTools,
      usePrepareStepStrategy: coreConfig.tools.usePrepareStepStrategy,
      experimentalMultiStepLoop: coreConfig.tools.experimentalMultiStepLoop,
      showParameterSchemas: coreConfig.tools.showParameterSchemas,
      experimentalMultiStepLoopMaxRounds: coreConfig.tools.experimentalMultiStepLoopMaxRounds,
    },
    models: {
      inactive: coreConfig.models.inactive,
      provider: coreConfig.models.provider,
    },
    improvement: coreConfig.improvement,
    verification: coreConfig.verification,
    context: coreConfig.context,
    evolution: coreConfig.evolution,
    ingestion: {
      taskLimit: 100, // default value
    },
    limits: coreConfig.limits,
  }
}
