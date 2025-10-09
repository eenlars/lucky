/**
 * Core configuration types for standalone core module.
 * These types define the complete configuration surface for core.
 */

import type { AnyModelName } from "@core/utils/spending/models.types"
import type { LuckyProvider } from "@lucky/shared"

/**
 * Filesystem paths configuration.
 * All paths default to being relative to process.cwd()
 */
export interface CorePathsConfig {
  /** Root directory for core data (default: ./.core-data) */
  readonly root: string
  /** Application directory */
  readonly app: string
  /** Runtime directory */
  readonly runtime: string
  /** Code tools directory */
  readonly codeTools: string
  /** Setup file path */
  readonly setupFile: string
  /** Improver config file path */
  readonly improver: string
  /** Node-specific paths */
  readonly node: {
    readonly logging: string
    readonly memory: {
      readonly root: string
      readonly workfiles: string
    }
    readonly error: string
  }
}

/**
 * Models configuration
 */
export interface CoreModelsConfig {
  /** Model provider (openrouter, openai, groq) */
  readonly provider: LuckyProvider
  /** Inactive models that should not be used */
  readonly inactive: string[]
  /** Default models for different tiers */
  readonly defaults: {
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
}

/**
 * Tools configuration
 */
export interface CoreToolsConfig {
  /** Inactive tools that should not be used */
  readonly inactive: string[]
  /** Whether each agent should have unique tools */
  readonly uniqueToolsPerAgent: boolean
  /** Whether each agent should have unique tool sets */
  readonly uniqueToolSetsPerAgent: boolean
  /** Maximum tools per agent */
  readonly maxToolsPerAgent: number
  /** Maximum steps for Vercel AI SDK */
  readonly maxStepsVercel: number
  /** Default tools to always include */
  readonly defaultTools: string[]
  /** Whether to auto-select tools */
  readonly autoSelectTools: boolean
  /** Whether to use prepare step strategy */
  readonly usePrepareStepStrategy: boolean
  /** Whether to use experimental multi-step loop */
  readonly experimentalMultiStepLoop: boolean
  /** Whether to show parameter schemas */
  readonly showParameterSchemas: boolean
  /** Maximum rounds for multi-step loop */
  readonly experimentalMultiStepLoopMaxRounds: number
}

/**
 * Logging configuration
 */
export interface CoreLoggingConfig {
  /** Global log level */
  readonly level: "none" | "error" | "info" | "debug"
  /** Component-specific log level overrides */
  readonly override: {
    readonly API: boolean
    readonly GP: boolean
    readonly Database: boolean
    readonly Tools: boolean
    readonly Summary: boolean
    readonly InvocationPipeline: boolean
    readonly Messaging: boolean
    readonly Improvement: boolean
    readonly ValidationBeforeHandoff: boolean
    readonly Setup: boolean
  }
}

/**
 * Workflow execution configuration
 */
export interface CoreWorkflowConfig {
  /** Maximum total node invocations per workflow */
  readonly maxTotalNodeInvocations: number
  /** Maximum invocations per individual node */
  readonly maxPerNodeInvocations?: number
  /** Maximum nodes in a workflow */
  readonly maxNodes: number
  /** Handoff content mode */
  readonly handoffContent: "summary" | "full"
  /** Whether to prepare problem before execution */
  readonly prepareProblem: boolean
  /** Problem preparation method */
  readonly prepareProblemMethod: "ai" | "workflow"
  /** Workflow version ID for problem preparation */
  readonly prepareProblemWorkflowVersionId: string
  /** Whether to enable parallel execution */
  readonly parallelExecution: boolean
}

/**
 * Evolution Genetic Programming configuration
 */
export interface CoreEvolutionConfig {
  /** Number of iterative improvement iterations */
  readonly iterativeIterations: number
  /** Genetic Programming configuration */
  readonly GP: {
    readonly generations: number
    readonly populationSize: number
    readonly verbose: boolean
    readonly initialPopulationMethod: "random" | "baseWorkflow" | "prepared"
    readonly initialPopulationFile: string | null
    readonly maximumTimeMinutes: number
  }
}

/**
 * Fitness calculation configuration
 */
export interface CoreFitnessConfig {
  readonly timeThresholdSeconds: number
  readonly baselineTimeSeconds: number
  readonly baselineCostUsd: number
  readonly costThresholdUsd: number
  readonly weights: {
    readonly score: number
    readonly time: number
    readonly cost: number
  }
}

/**
 * Improvement flags configuration
 */
export interface CoreImprovementFlagsConfig {
  readonly selfImproveNodes: boolean
  readonly addTools: boolean
  readonly analyzeWorkflow: boolean
  readonly removeNodes: boolean
  readonly editNodes: boolean
  readonly maxRetriesForWorkflowRepair: number
  readonly useSummariesForImprovement: boolean
  readonly improvementType: "judge" | "unified"
  readonly operatorsWithFeedback: boolean
}

/**
 * Rate limits and cost controls
 */
export interface CoreLimitsConfig {
  readonly maxConcurrentWorkflows: number
  readonly maxConcurrentAIRequests: number
  readonly maxCostUsdPerRun: number
  readonly enableSpendingLimits: boolean
  readonly maxRequestsPerWindow: number
  readonly rateWindowMs: number
  readonly enableStallGuard: boolean
  readonly enableParallelLimit: boolean
}

/**
 * Context files configuration
 */
export interface CoreContextConfig {
  readonly maxFilesPerWorkflow: number
  readonly enforceFileLimit: boolean
}

/**
 * Verification settings
 */
export interface CoreVerificationConfig {
  readonly allowCycles: boolean
  readonly enableOutputValidation: boolean
}

/**
 * Complete core configuration
 */
/**
 * persistence configuration
 */
export interface CorePersistenceConfig {
  /**
   * use mock (in-memory) persistence instead of supabase.
   *
   * useful for:
   * - running examples without supabase credentials
   * - fast tests that don't need database
   * - local development without cloud dependencies
   *
   * set via environment variable: USE_MOCK_PERSISTENCE=true
   *
   * @default false
   */
  readonly useMockBackend: boolean

  /**
   * default backend to use when not explicitly specified.
   *
   * @default "memory" if useMockBackend=true, otherwise "supabase"
   */
  readonly defaultBackend: "memory" | "supabase"
}

export interface CoreConfig {
  readonly paths: CorePathsConfig
  readonly models: CoreModelsConfig
  readonly tools: CoreToolsConfig
  readonly logging: CoreLoggingConfig
  readonly workflow: CoreWorkflowConfig
  readonly evolution: CoreEvolutionConfig
  readonly improvement: {
    readonly fitness: CoreFitnessConfig
    readonly flags: CoreImprovementFlagsConfig
  }
  readonly limits: CoreLimitsConfig
  readonly context: CoreContextConfig
  readonly verification: CoreVerificationConfig
  readonly persistence: CorePersistenceConfig
  readonly coordinationType: "sequential" | "hierarchical"
  readonly newNodeProbability: number
}
