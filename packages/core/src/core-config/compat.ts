/**
 * Compatibility layer for core-config migration.
 * RE-EXPORTS from @lucky/shared/contracts for backward compatibility.
 *
 * MIGRATION: All imports now come from @lucky/shared/contracts.
 * New code should import directly from '@lucky/shared/contracts/*'
 */

import { getCoreConfig } from "@core/core-config/coreConfig"
import type { RuntimeConfig } from "@lucky/shared/contracts/config"
import type { EvolutionSettings } from "@lucky/shared/contracts/evolution"
import { createEvolutionSettings } from "@lucky/shared/contracts/evolution"
import type { EvaluationInput } from "@lucky/shared/contracts/ingestion"
import { TOOLS } from "@lucky/shared/contracts/tools"

// Import live core config to support runtime overrides
import type { CoreConfig, CorePathsConfig } from "./types"
import { toRuntimeContract } from "./validation"

type CompatToolDefinitions = typeof TOOLS

type LegacyToolConfig = RuntimeConfig["tools"] & {
  readonly mcp: CompatToolDefinitions["mcp"]
  readonly code: CompatToolDefinitions["code"]
}

type LegacyWorkflowConfig = RuntimeConfig["workflow"] & {
  readonly asyncExecution: boolean
}

type LegacyLimitsConfig = RuntimeConfig["limits"] & {
  readonly maxFilesPerWorkflow: number
  readonly enforceFileLimit: boolean
}

type LegacyVerificationConfig = RuntimeConfig["verification"] & {
  readonly maxFilesPerWorkflow: number
  readonly enforceFileLimit: boolean
}

type LegacyRuntimeConfig = Omit<RuntimeConfig, "tools" | "limits" | "verification"> & {
  readonly tools: LegacyToolConfig
  readonly persistence: RuntimeConfig["persistence"]
  readonly workflow: LegacyWorkflowConfig
  readonly limits: LegacyLimitsConfig
  readonly verification: LegacyVerificationConfig
  readonly ingestion: {
    readonly taskLimit: number
  }
}

// ============================================================================
// CONFIGURATION RE-EXPORTS (Live Config Access)
// ============================================================================

/**
 * Lazy object that proxies access to live core config
 * This ensures CONFIG always reflects runtime overrides
 */
const _configProxy = new Proxy({} as LegacyRuntimeConfig, {
  get: (_target, prop) => {
    const liveConfig = getCoreConfig()
    const legacyConfig = createLegacyFlowConfig(liveConfig)

    if (typeof prop === "string") {
      if (prop in legacyConfig) {
        return legacyConfig[prop as keyof LegacyRuntimeConfig]
      }
      return undefined
    }

    if (typeof prop === "symbol") {
      return (legacyConfig as Record<symbol, unknown>)[prop]
    }

    return undefined
  },
})

/**
 * Runtime configuration (maps to RuntimeConfig)
 * NOW READS FROM LIVE CORE CONFIG to reflect runtime overrides
 */
export const CONFIG: LegacyRuntimeConfig = _configProxy

/**
 * Lazy object that proxies access to live core paths
 */
const _pathsProxy = new Proxy({} as CorePathsConfig, {
  get: (_target, prop) => {
    return getCoreConfig().paths[prop as keyof CoreConfig["paths"]]
  },
})

/**
 * Filesystem paths configuration
 * NOW READS FROM LIVE CORE CONFIG to reflect runtime overrides
 */
export const PATHS: CorePathsConfig = _pathsProxy

/**
 * Lazy object that proxies access to live model defaults
 */
const _modelsProxy = new Proxy({} as TypedModelDefaults, {
  get: (_target, prop) => {
    return getCoreConfig().models.defaults[prop as keyof TypedModelDefaults]
  },
})

/**
 * Model defaults
 * NOW READS FROM LIVE CORE CONFIG to reflect runtime overrides
 */
export const MODELS: TypedModelDefaults = _modelsProxy

/**
 * Lazy object that proxies access to live model config
 */
type ModelConfigProxy = Pick<CoreConfig["models"], "gateway" | "inactive">

const _modelConfigProxy = new Proxy({} as ModelConfigProxy, {
  get: (_target, prop) => {
    const models = getCoreConfig().models
    if (prop === "gateway") return models.gateway
    if (prop === "inactive") return models.inactive
    return undefined
  },
})

/**
 * Model configuration (provider + inactive)
 * NOW READS FROM LIVE CORE CONFIG to reflect runtime overrides
 */
export const MODEL_CONFIG: ModelConfigProxy = _modelConfigProxy

/**
 * Tool definitions with descriptions
 */
export { TOOLS }

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Typed model defaults using AnyGatewayModelId for type safety
 * All properties are readonly to prevent accidental mutation of shared config
 */
export type TypedModelDefaults = {
  readonly summary: string
  readonly nano: string
  readonly low: string
  readonly balanced: string
  readonly high: string
  readonly default: string
  readonly fitness: string
  readonly reasoning: string
  readonly fallback: string
}

/**
 * Re-export from coreConfig.ts
 */
export { getDefaultModels, isLoggingEnabled } from "./coreConfig"

/**
 * Create evolution settings with optional overrides
 * NOW SEEDS FROM LIVE CORE CONFIG to carry through configured defaults
 */
export function createEvolutionSettingsWithConfig(overrides?: Partial<EvolutionSettings>) {
  const liveConfig = getCoreConfig()
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
function createLegacyFlowConfig(coreConfig: CoreConfig): LegacyRuntimeConfig {
  const runtimeConfig = toRuntimeContract(coreConfig)

  return {
    coordinationType: runtimeConfig.coordinationType,
    newNodeProbability: runtimeConfig.newNodeProbability,
    logging: runtimeConfig.logging,
    workflow: {
      ...runtimeConfig.workflow,
      asyncExecution: false, // deprecated
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
    models: runtimeConfig.models,
    persistence: runtimeConfig.persistence,
    improvement: runtimeConfig.improvement,
    verification: {
      ...runtimeConfig.verification,
      maxFilesPerWorkflow: coreConfig.verification.maxFilesPerWorkflow,
      enforceFileLimit: coreConfig.verification.enforceFileLimit,
    },
    context: runtimeConfig.context,
    evolution: runtimeConfig.evolution,
    ingestion: {
      taskLimit: 100,
    },
    limits: {
      ...runtimeConfig.limits,
      maxFilesPerWorkflow: coreConfig.limits.maxFilesPerWorkflow,
      enforceFileLimit: coreConfig.limits.enforceFileLimit,
    },
  }
}

export type { LegacyRuntimeConfig }

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
