/**
 * Compatibility layer for core-config migration.
 * RE-EXPORTS from @lucky/contracts for backward compatibility.
 *
 * MIGRATION: All imports now come from @lucky/contracts.
 * New code should import directly from '@lucky/contracts/*'
 */

import path from "node:path"
import type { AnyModelName } from "@core/utils/spending/models.types"
import { DEFAULT_RUNTIME_CONFIG, type RuntimeConfig } from "@lucky/contracts/config"
import type { ModelDefaults } from "@lucky/contracts/config"
import { createEvolutionSettings } from "@lucky/contracts/evolution"
import type { EvaluationInput } from "@lucky/contracts/ingestion"
import { type AllToolNames, DEFAULT_INACTIVE_TOOLS, TOOLS } from "@lucky/contracts/tools"

// ============================================================================
// CONFIGURATION RE-EXPORTS
// ============================================================================

/**
 * Runtime configuration (maps to RuntimeConfig)
 */
export const CONFIG = createLegacyFlowConfig(DEFAULT_RUNTIME_CONFIG)

/**
 * Filesystem paths configuration
 */
export const PATHS = createCorePaths()

/**
 * Model defaults
 */
export const MODELS = DEFAULT_RUNTIME_CONFIG.models.defaults

/**
 * Model configuration (provider + inactive)
 */
export const MODEL_CONFIG = {
  provider: DEFAULT_RUNTIME_CONFIG.models.provider,
  inactive: DEFAULT_RUNTIME_CONFIG.models.inactive,
}

/**
 * Tool definitions with descriptions
 */
export { TOOLS }

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Typed model defaults using AnyModelName for type safety
 */
export type TypedModelDefaults = {
  summary: AnyModelName
  nano: AnyModelName
  low: AnyModelName
  medium: AnyModelName
  high: AnyModelName
  default: AnyModelName
  fitness: AnyModelName
  reasoning: AnyModelName
  fallback: AnyModelName
}

/**
 * Get default models configuration
 */
export function getDefaultModels(): TypedModelDefaults {
  return DEFAULT_RUNTIME_CONFIG.models.defaults as TypedModelDefaults
}

/**
 * Check if logging is enabled for a specific component
 */
export function isLoggingEnabled(component: keyof typeof DEFAULT_RUNTIME_CONFIG.logging.override): boolean {
  return DEFAULT_RUNTIME_CONFIG.logging.override[component]
}

/**
 * Create evolution settings with optional overrides
 */
export function createEvolutionSettingsWithConfig(overrides?: any) {
  return createEvolutionSettings(overrides)
}

/**
 * Selected question for evaluation (default placeholder)
 */
export const SELECTED_QUESTION: EvaluationInput = {
  type: "text",
  question: "Default question for standalone mode",
  answer: "Default answer",
  goal: "Default goal",
  workflowId: "wf-default",
}

// ============================================================================
// LEGACY TYPE MAPPING
// ============================================================================

/**
 * Map RuntimeConfig to legacy FlowRuntimeConfig format
 */
function createLegacyFlowConfig(runtimeConfig: RuntimeConfig): any {
  return {
    coordinationType: runtimeConfig.coordinationType,
    newNodeProbability: runtimeConfig.newNodeProbability,
    logging: runtimeConfig.logging,
    workflow: {
      parallelExecution: runtimeConfig.workflow.parallelExecution,
      asyncExecution: false, // deprecated
      maxTotalNodeInvocations: runtimeConfig.workflow.maxTotalNodeInvocations,
      maxPerNodeInvocations: runtimeConfig.workflow.maxPerNodeInvocations,
      maxNodes: runtimeConfig.workflow.maxNodes,
      handoffContent: runtimeConfig.workflow.handoffContent,
      prepareProblem: runtimeConfig.workflow.prepareProblem,
      prepareProblemMethod: runtimeConfig.workflow.prepareProblemMethod,
      prepareProblemWorkflowVersionId: runtimeConfig.workflow.prepareProblemWorkflowVersionId,
    },
    tools: {
      inactive: runtimeConfig.tools.inactive,
      uniqueToolsPerAgent: runtimeConfig.tools.uniqueToolsPerAgent,
      uniqueToolSetsPerAgent: runtimeConfig.tools.uniqueToolSetsPerAgent,
      maxToolsPerAgent: runtimeConfig.tools.maxToolsPerAgent,
      maxStepsVercel: runtimeConfig.tools.maxStepsVercel,
      defaultTools: runtimeConfig.tools.defaultTools,
      autoSelectTools: runtimeConfig.tools.autoSelectTools,
      usePrepareStepStrategy: runtimeConfig.tools.usePrepareStepStrategy,
      experimentalMultiStepLoop: runtimeConfig.tools.experimentalMultiStepLoop,
      showParameterSchemas: runtimeConfig.tools.showParameterSchemas,
      experimentalMultiStepLoopMaxRounds: runtimeConfig.tools.experimentalMultiStepLoopMaxRounds,
      mcp: TOOLS.mcp,
      code: TOOLS.code,
    },
    models: {
      inactive: runtimeConfig.models.inactive,
      provider: runtimeConfig.models.provider,
    },
    improvement: runtimeConfig.improvement,
    verification: runtimeConfig.verification,
    context: runtimeConfig.context,
    evolution: runtimeConfig.evolution,
    ingestion: {
      taskLimit: 100,
    },
    limits: runtimeConfig.limits,
  }
}

/**
 * Create core paths (server-only, uses process.cwd())
 */
function createCorePaths() {
  const cwd = process.cwd()
  const coreDataRoot = path.join(cwd, ".core-data")
  const loggingDir = path.join(coreDataRoot, "logs")
  const memoryRoot = path.join(coreDataRoot, "memory")

  // Find examples directory
  const examplesRoot = path.resolve(cwd, "../examples")
  const codeToolsPath = path.join(examplesRoot, "code_tools")

  return {
    root: coreDataRoot,
    app: path.join(coreDataRoot, "app"),
    runtime: examplesRoot,
    codeTools: codeToolsPath,
    setupFile: path.join(coreDataRoot, "setup", "setupfile.json"),
    improver: path.join(coreDataRoot, "setup", "improve.json"),
    node: {
      logging: loggingDir,
      memory: {
        root: memoryRoot,
        workfiles: path.join(memoryRoot, "workfiles"),
      },
      error: path.join(loggingDir, "error"),
    },
  }
}

// ============================================================================
// PLACEHOLDER TOOLS (for test compatibility)
// ============================================================================

export const tavily = {
  name: "tavily",
  description: "Search the web",
  inputSchema: {},
}

export const todoWrite = {
  name: "todoWrite",
  description: "Create and manage structured task lists for coding sessions",
  inputSchema: {},
}
