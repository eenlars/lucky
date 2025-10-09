/**
 * Runtime configuration contract for workflow execution.
 * Defines execution settings, limits, and behaviors.
 */

import { z } from "zod"

/**
 * Model provider type
 */
export const ModelProviderSchema = z.enum(["openrouter", "openai", "groq"])

/**
 * Coordination type for workflow execution
 */
export const CoordinationTypeSchema = z.enum(["sequential", "hierarchical"])

/**
 * Log level configuration
 */
export const LogLevelSchema = z.enum(["none", "error", "info", "debug"])

/**
 * Handoff content mode
 */
export const HandoffContentSchema = z.enum(["summary", "full"])

/**
 * Problem preparation method
 */
export const PrepareProblemMethodSchema = z.enum(["ai", "workflow"])

/**
 * Improvement type
 */
export const ImprovementTypeSchema = z.enum(["judge", "unified"])

/**
 * Model tier defaults configuration
 */
export const ModelDefaultsSchema = z.object({
  /** Model for summarization tasks */
  summary: z.string(),
  /** Smallest/fastest model */
  nano: z.string(),
  /** Low-tier model */
  low: z.string(),
  /** Medium-tier model */
  medium: z.string(),
  /** High-tier model */
  high: z.string(),
  /** Default model when tier not specified */
  default: z.string(),
  /** Model for fitness evaluation */
  fitness: z.string(),
  /** Model for reasoning tasks */
  reasoning: z.string(),
  /** Fallback model */
  fallback: z.string(),
})

/**
 * Models configuration
 */
export const ModelsConfigSchema = z.object({
  /** Model provider */
  provider: ModelProviderSchema,
  /** Inactive models that should not be used */
  inactive: z.array(z.string()),
  /** Default models for different tiers */
  defaults: ModelDefaultsSchema,
})

/**
 * Logging configuration with component-specific overrides
 */
export const LoggingConfigSchema = z.object({
  level: LogLevelSchema,
  override: z.object({
    API: z.boolean(),
    GP: z.boolean(),
    Database: z.boolean(),
    Tools: z.boolean(),
    Summary: z.boolean(),
    InvocationPipeline: z.boolean(),
    Messaging: z.boolean(),
    Improvement: z.boolean(),
    ValidationBeforeHandoff: z.boolean(),
    Setup: z.boolean(),
  }),
})

/**
 * Tools configuration
 */
export const ToolsConfigSchema = z.object({
  /** Tools that should not be used */
  inactive: z.array(z.string()),
  /** Whether each agent should have unique tools */
  uniqueToolsPerAgent: z.boolean(),
  /** Whether each agent should have unique tool sets */
  uniqueToolSetsPerAgent: z.boolean(),
  /** Maximum tools per agent */
  maxToolsPerAgent: z.number().int().positive(),
  /** Maximum steps for Vercel AI SDK */
  maxStepsVercel: z.number().int().positive(),
  /** Default tools to always include */
  defaultTools: z.array(z.string()),
  /** Whether to auto-select tools */
  autoSelectTools: z.boolean(),
  /** Whether to use prepare step strategy */
  usePrepareStepStrategy: z.boolean(),
  /** Whether to use experimental multi-step loop */
  experimentalMultiStepLoop: z.boolean(),
  /** Whether to show parameter schemas */
  showParameterSchemas: z.boolean(),
  /** Maximum rounds for multi-step loop */
  experimentalMultiStepLoopMaxRounds: z.number().int().positive(),
})

/**
 * Workflow execution configuration
 */
export const WorkflowConfigSchema = z.object({
  /** Maximum total node invocations per workflow */
  maxTotalNodeInvocations: z.number().int().positive(),
  /** Maximum invocations per individual node */
  maxPerNodeInvocations: z.number().int().positive().optional(),
  /** Maximum nodes in a workflow */
  maxNodes: z.number().int().positive(),
  /** Handoff content mode */
  handoffContent: HandoffContentSchema,
  /** Whether to prepare problem before execution */
  prepareProblem: z.boolean(),
  /** Problem preparation method */
  prepareProblemMethod: PrepareProblemMethodSchema,
  /** Workflow version ID for problem preparation */
  prepareProblemWorkflowVersionId: z.string(),
  /** Whether to enable parallel execution */
  parallelExecution: z.boolean(),
})

/**
 * Fitness calculation weights
 */
export const FitnessWeightsSchema = z.object({
  score: z.number().min(0).max(1),
  time: z.number().min(0).max(1),
  cost: z.number().min(0).max(1),
})

/**
 * Fitness calculation configuration
 */
export const FitnessConfigSchema = z.object({
  timeThresholdSeconds: z.number().positive(),
  baselineTimeSeconds: z.number().positive(),
  baselineCostUsd: z.number().positive(),
  costThresholdUsd: z.number().positive(),
  weights: FitnessWeightsSchema,
})

/**
 * Improvement flags configuration
 */
export const ImprovementFlagsSchema = z.object({
  selfImproveNodes: z.boolean(),
  addTools: z.boolean(),
  analyzeWorkflow: z.boolean(),
  removeNodes: z.boolean(),
  editNodes: z.boolean(),
  maxRetriesForWorkflowRepair: z.number().int().nonnegative(),
  useSummariesForImprovement: z.boolean(),
  improvementType: ImprovementTypeSchema,
  operatorsWithFeedback: z.boolean(),
})

/**
 * Improvement configuration (fitness + flags)
 */
export const ImprovementConfigSchema = z.object({
  fitness: FitnessConfigSchema,
  flags: ImprovementFlagsSchema,
})

/**
 * Rate limits and cost controls
 */
export const LimitsConfigSchema = z.object({
  maxConcurrentWorkflows: z.number().int().positive(),
  maxConcurrentAIRequests: z.number().int().positive(),
  maxCostUsdPerRun: z.number().positive(),
  enableSpendingLimits: z.boolean(),
  maxRequestsPerWindow: z.number().int().positive(),
  rateWindowMs: z.number().int().positive(),
  enableStallGuard: z.boolean(),
  enableParallelLimit: z.boolean(),
})

/**
 * Context files configuration
 */
export const ContextConfigSchema = z.object({
  maxFilesPerWorkflow: z.number().int().positive(),
  enforceFileLimit: z.boolean(),
})

/**
 * Verification settings
 */
export const VerificationConfigSchema = z.object({
  allowCycles: z.boolean(),
  enableOutputValidation: z.boolean(),
})

/**
 * Persistence configuration
 */
export const PersistenceConfigSchema = z.object({
  /** Use mock (in-memory) persistence instead of database */
  useMockBackend: z.boolean(),
  /** Default backend to use when not explicitly specified */
  defaultBackend: z.enum(["memory", "supabase"]),
})

/**
 * Complete runtime configuration for workflow execution
 */
export const RuntimeConfigSchema = z.object({
  /** Coordination type for workflow execution */
  coordinationType: CoordinationTypeSchema,
  /** Probability of creating new nodes during evolution */
  newNodeProbability: z.number().min(0).max(1),
  /** Models configuration */
  models: ModelsConfigSchema,
  /** Logging configuration */
  logging: LoggingConfigSchema,
  /** Tools configuration */
  tools: ToolsConfigSchema,
  /** Workflow execution configuration */
  workflow: WorkflowConfigSchema,
  /** Improvement configuration */
  improvement: ImprovementConfigSchema,
  /** Rate limits and cost controls */
  limits: LimitsConfigSchema,
  /** Context files configuration */
  context: ContextConfigSchema,
  /** Verification settings */
  verification: VerificationConfigSchema,
  /** Persistence configuration */
  persistence: PersistenceConfigSchema,
})

/**
 * Partial runtime configuration for overrides
 */
export const PartialRuntimeConfigSchema = RuntimeConfigSchema.deepPartial()

// Type exports
export type ModelProvider = z.infer<typeof ModelProviderSchema>
export type CoordinationType = z.infer<typeof CoordinationTypeSchema>
export type LogLevel = z.infer<typeof LogLevelSchema>
export type HandoffContent = z.infer<typeof HandoffContentSchema>
export type PrepareProblemMethod = z.infer<typeof PrepareProblemMethodSchema>
export type ImprovementType = z.infer<typeof ImprovementTypeSchema>

export type ModelDefaults = z.infer<typeof ModelDefaultsSchema>
export type ModelsConfig = z.infer<typeof ModelsConfigSchema>
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>
export type ToolsConfig = z.infer<typeof ToolsConfigSchema>
export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>
export type FitnessWeights = z.infer<typeof FitnessWeightsSchema>
export type FitnessConfig = z.infer<typeof FitnessConfigSchema>
export type ImprovementFlags = z.infer<typeof ImprovementFlagsSchema>
export type ImprovementConfig = z.infer<typeof ImprovementConfigSchema>
export type LimitsConfig = z.infer<typeof LimitsConfigSchema>
export type ContextConfig = z.infer<typeof ContextConfigSchema>
export type VerificationConfig = z.infer<typeof VerificationConfigSchema>
export type PersistenceConfig = z.infer<typeof PersistenceConfigSchema>

export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>
export type PartialRuntimeConfig = z.infer<typeof PartialRuntimeConfigSchema>

/**
 * Validate runtime configuration with detailed error messages
 */
export function validateRuntimeConfig(config: unknown): RuntimeConfig {
  return RuntimeConfigSchema.parse(config)
}

/**
 * Safe validation that returns result object
 */
export function safeValidateRuntimeConfig(config: unknown) {
  return RuntimeConfigSchema.safeParse(config)
}

/**
 * Validate partial runtime configuration (for overrides)
 */
export function validatePartialRuntimeConfig(config: unknown): PartialRuntimeConfig {
  return PartialRuntimeConfigSchema.parse(config)
}
