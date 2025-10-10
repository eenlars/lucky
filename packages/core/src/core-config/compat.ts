/**
 * Compatibility layer for core-config migration.
 * RE-EXPORTS from @lucky/shared/contracts for backward compatibility.
 *
 * MIGRATION: All imports now come from @lucky/shared/contracts.
 * New code should import directly from '@lucky/shared/contracts/*'
 */

import path from "node:path"
import type { AnyModelName } from "@core/utils/spending/models.types"
import type { DEFAULT_RUNTIME_CONFIG, RuntimeConfig } from "@lucky/shared/contracts/config"
import type { ModelDefaults } from "@lucky/shared/contracts/config"
import { createEvolutionSettings } from "@lucky/shared/contracts/evolution"
import type { EvaluationInput } from "@lucky/shared/contracts/ingestion"
import { type AllToolNames, DEFAULT_INACTIVE_TOOLS, TOOLS } from "@lucky/shared/contracts/tools"

// Import live core config to support runtime overrides
import type { CoreConfig } from "./types"
import { toRuntimeContract } from "./validation"

// ============================================================================
// CONFIGURATION RE-EXPORTS (Live Config Access)
// ============================================================================

/**
 * Lazy getter for live core config to avoid circular dependency
 */
let _getCoreConfigFn: (() => CoreConfig) | null = null
function getLiveCoreConfig(): CoreConfig {
  if (!_getCoreConfigFn) {
    // Lazy import to avoid circular dependency
    _getCoreConfigFn = require("./coreConfig").getCoreConfig
  }
  // Non-null assertion: we know it's set after the if check
  return _getCoreConfigFn!()
}

/**
 * Lazy object that proxies access to live core config
 * This ensures CONFIG always reflects runtime overrides
 */
const _configProxy = new Proxy({} as any, {
  get: (_target, prop) => {
    const liveConfig = getLiveCoreConfig()
    const legacyConfig = createLegacyFlowConfig(toRuntimeContract(liveConfig))
    return legacyConfig[prop]
  },
})

/**
 * Runtime configuration (maps to RuntimeConfig)
 * NOW READS FROM LIVE CORE CONFIG to reflect runtime overrides
 */
export const CONFIG: any = _configProxy

/**
 * Lazy object that proxies access to live core paths
 */
const _pathsProxy = new Proxy({} as any, {
  get: (_target, prop) => {
    return getLiveCoreConfig().paths[prop as keyof CoreConfig["paths"]]
  },
})

/**
 * Filesystem paths configuration
 * NOW READS FROM LIVE CORE CONFIG to reflect runtime overrides
 */
export const PATHS: any = _pathsProxy

/**
 * Lazy object that proxies access to live model defaults
 */
const _modelsProxy = new Proxy({} as any, {
  get: (_target, prop) => {
    return getLiveCoreConfig().models.defaults[prop as keyof TypedModelDefaults]
  },
})

/**
 * Model defaults
 * NOW READS FROM LIVE CORE CONFIG to reflect runtime overrides
 */
export const MODELS: any = _modelsProxy

/**
 * Lazy object that proxies access to live model config
 */
const _modelConfigProxy = new Proxy({} as any, {
  get: (_target, prop) => {
    const models = getLiveCoreConfig().models
    if (prop === "provider") return models.provider
    if (prop === "inactive") return models.inactive
    return undefined
  },
})

/**
 * Model configuration (provider + inactive)
 * NOW READS FROM LIVE CORE CONFIG to reflect runtime overrides
 */
export const MODEL_CONFIG: any = _modelConfigProxy

/**
 * Tool definitions with descriptions
 */
export { TOOLS }

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Typed model defaults using AnyModelName for type safety
 * All properties are readonly to prevent accidental mutation of shared config
 */
export type TypedModelDefaults = {
  readonly summary: AnyModelName
  readonly nano: AnyModelName
  readonly low: AnyModelName
  readonly medium: AnyModelName
  readonly high: AnyModelName
  readonly default: AnyModelName
  readonly fitness: AnyModelName
  readonly reasoning: AnyModelName
  readonly fallback: AnyModelName
}

/**
 * Get default models configuration
 * NOW READS FROM LIVE CORE CONFIG to reflect runtime overrides
 */
export function getDefaultModels(): TypedModelDefaults {
  return getLiveCoreConfig().models.defaults as TypedModelDefaults
}

/**
 * Check if logging is enabled for a specific component
 * NOW READS FROM LIVE CORE CONFIG to reflect runtime overrides
 */
export function isLoggingEnabled(component: keyof typeof DEFAULT_RUNTIME_CONFIG.logging.override): boolean {
  const liveConfig = getLiveCoreConfig()
  const runtimeConfig = toRuntimeContract(liveConfig)
  return runtimeConfig.logging.override[component]
}

/**
 * Create evolution settings with optional overrides
 * NOW SEEDS FROM LIVE CORE CONFIG to carry through configured defaults
 */
export function createEvolutionSettingsWithConfig(overrides?: any) {
  const liveConfig = getLiveCoreConfig()
  const runtimeConfig = toRuntimeContract(liveConfig)

  // Seed with live core config values (e.g., maxCostUSD from limits)
  const baseSettings = {
    mode: "GP" as const,
    ...runtimeConfig.evolution.GP,
    maxCostUSD: runtimeConfig.limits.maxCostUsdPerRun,
  }

  return createEvolutionSettings({ ...baseSettings, ...overrides })
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
