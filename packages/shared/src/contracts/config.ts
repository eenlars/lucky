/**
 * Runtime configuration contracts with embedded defaults.
 * Single source of truth for all configuration.
 *
 * Pattern: Zod schema defines shape + validation + defaults
 * Usage: Import schemas for validation, DEFAULT_* for defaults
 */

import { z } from "zod"

// ============================================================================
// LOGGING CONFIGURATION
// ============================================================================

export const LogLevelSchema = z.enum(["none", "error", "info", "debug"]).default("info")

export const LoggingOverrideSchema = z.object({
  API: z.boolean().default(false),
  GP: z.boolean().default(false),
  Database: z.boolean().default(false),
  Tools: z.boolean().default(false),
  Summary: z.boolean().default(false),
  InvocationPipeline: z.boolean().default(false),
  Messaging: z.boolean().default(false),
  Improvement: z.boolean().default(true),
  ValidationBeforeHandoff: z.boolean().default(false),
  Setup: z.boolean().default(false),
})

export const LoggingConfigSchema = z.object({
  level: LogLevelSchema,
  override: LoggingOverrideSchema.default({}),
})

export type LogLevel = z.infer<typeof LogLevelSchema>
export type LoggingOverride = z.infer<typeof LoggingOverrideSchema>
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>

// ============================================================================
// TOOLS CONFIGURATION
// ============================================================================

export const ToolsConfigSchema = z.object({
  inactive: z.array(z.string()).default([]),
  defaultTools: z.array(z.string()).default([]),
  uniqueToolsPerAgent: z.boolean().default(false),
  uniqueToolSetsPerAgent: z.boolean().default(false),
  maxToolsPerAgent: z.number().int().positive().default(3),
  maxStepsVercel: z.number().int().positive().default(10),
  autoSelectTools: z.boolean().default(true),
  usePrepareStepStrategy: z.boolean().default(false),
  experimentalMultiStepLoop: z.boolean().default(true),
  showParameterSchemas: z.boolean().default(true),
  experimentalMultiStepLoopMaxRounds: z.number().int().positive().default(6),
})

export type ToolsConfig = z.infer<typeof ToolsConfigSchema>

// ============================================================================
// MODELS CONFIGURATION
// ============================================================================

/**
 * Provider availability configuration - single source of truth.
 * Providers marked as disabled will not be initialized even if API keys are present.
 */
export const PROVIDER_AVAILABILITY = {
  openai: true,
  openrouter: false, // Disabled
  groq: false, // Disabled
} as const

export const ModelProviderSchema = z.enum(["openrouter", "openai", "groq"]).default("openai")

export const ModelDefaultsSchema = z.object({
  summary: z.string().default("gpt-5-nano"),
  nano: z.string().default("gpt-5-nano"),
  low: z.string().default("gpt-5-mini"),
  medium: z.string().default("gpt-5-mini"),
  high: z.string().default("gpt-5"),
  default: z.string().default("gpt-5-nano"),
  fitness: z.string().default("gpt-5-nano"),
  reasoning: z.string().default("gpt-5"),
  fallback: z.string().default("gpt-5-nano"),
})

export const ModelsConfigSchema = z.object({
  provider: ModelProviderSchema,
  inactive: z.array(z.string()).default(["moonshotai/kimi-k2", "x-ai/grok-4", "qwen/qwq-32b:free"]),
  defaults: ModelDefaultsSchema.default({}),
})

export type ModelProvider = z.infer<typeof ModelProviderSchema>
export type ModelDefaults = z.infer<typeof ModelDefaultsSchema>
export type ModelsConfig = z.infer<typeof ModelsConfigSchema>

// ============================================================================
// WORKFLOW EXECUTION CONFIGURATION
// ============================================================================

export const HandoffContentSchema = z.enum(["summary", "full"]).default("full")
export const PrepareProblemMethodSchema = z.enum(["ai", "workflow"]).default("ai")

export const WorkflowExecutionConfigSchema = z.object({
  maxTotalNodeInvocations: z.number().int().positive().default(14),
  maxPerNodeInvocations: z.number().int().positive().optional().default(14),
  maxNodes: z.number().int().positive().default(20),
  handoffContent: HandoffContentSchema,
  prepareProblem: z.boolean().default(true),
  prepareProblemMethod: PrepareProblemMethodSchema,
  prepareProblemWorkflowVersionId: z.string().default(""),
  parallelExecution: z.boolean().default(false),
})

export type HandoffContent = z.infer<typeof HandoffContentSchema>
export type PrepareProblemMethod = z.infer<typeof PrepareProblemMethodSchema>
export type WorkflowExecutionConfig = z.infer<typeof WorkflowExecutionConfigSchema>

// ============================================================================
// EVOLUTION CONFIGURATION
// ============================================================================

export const GPConfigSchema = z.object({
  generations: z.number().int().positive().default(3),
  populationSize: z.number().int().positive().default(4),
  verbose: z.boolean().default(false),
  initialPopulationMethod: z.enum(["random", "baseWorkflow", "prepared"]).default("random"),
  initialPopulationFile: z.string().nullable().default(null),
  maximumTimeMinutes: z.number().positive().default(700),
})

export const EvolutionConfigSchema = z.object({
  iterativeIterations: z.number().int().positive().default(30),
  GP: GPConfigSchema.default({}),
})

export type GPConfig = z.infer<typeof GPConfigSchema>
export type EvolutionConfig = z.infer<typeof EvolutionConfigSchema>

// ============================================================================
// FITNESS CONFIGURATION
// ============================================================================

export const FitnessWeightsSchema = z.object({
  score: z.number().min(0).max(1).default(0.7),
  time: z.number().min(0).max(1).default(0.2),
  cost: z.number().min(0).max(1).default(0.1),
})

export const FitnessConfigSchema = z.object({
  timeThresholdSeconds: z.number().positive().default(300),
  baselineTimeSeconds: z.number().positive().default(60),
  baselineCostUsd: z.number().positive().default(0.005),
  costThresholdUsd: z.number().positive().default(0.01),
  weights: FitnessWeightsSchema.default({}),
})

export type FitnessWeights = z.infer<typeof FitnessWeightsSchema>
export type FitnessConfig = z.infer<typeof FitnessConfigSchema>

// ============================================================================
// IMPROVEMENT FLAGS CONFIGURATION
// ============================================================================

export const ImprovementTypeSchema = z.enum(["judge", "unified"]).default("judge")

export const ImprovementFlagsSchema = z.object({
  selfImproveNodes: z.boolean().default(false),
  addTools: z.boolean().default(true),
  analyzeWorkflow: z.boolean().default(true),
  removeNodes: z.boolean().default(true),
  editNodes: z.boolean().default(true),
  maxRetriesForWorkflowRepair: z.number().int().nonnegative().default(4),
  useSummariesForImprovement: z.boolean().default(true),
  improvementType: ImprovementTypeSchema,
  operatorsWithFeedback: z.boolean().default(true),
})

export const ImprovementConfigSchema = z.object({
  fitness: FitnessConfigSchema.default({}),
  flags: ImprovementFlagsSchema.default({}),
})

export type ImprovementType = z.infer<typeof ImprovementTypeSchema>
export type ImprovementFlags = z.infer<typeof ImprovementFlagsSchema>
export type ImprovementConfig = z.infer<typeof ImprovementConfigSchema>

// ============================================================================
// LIMITS CONFIGURATION
// ============================================================================

export const LimitsConfigSchema = z.object({
  maxConcurrentWorkflows: z.number().int().positive().default(2),
  maxConcurrentAIRequests: z.number().int().positive().default(30),
  maxCostUsdPerRun: z.number().positive().default(30.0),
  enableSpendingLimits: z.boolean().default(true),
  maxRequestsPerWindow: z.number().int().positive().default(300),
  rateWindowMs: z.number().int().positive().default(10000),
  enableStallGuard: z.boolean().default(true),
  enableParallelLimit: z.boolean().default(true),
})

export type LimitsConfig = z.infer<typeof LimitsConfigSchema>

// ============================================================================
// CONTEXT CONFIGURATION
// ============================================================================

export const ContextConfigSchema = z.object({
  maxFilesPerWorkflow: z.number().int().positive().default(1),
  enforceFileLimit: z.boolean().default(true),
})

export type ContextConfig = z.infer<typeof ContextConfigSchema>

// ============================================================================
// VERIFICATION CONFIGURATION
// ============================================================================

export const VerificationConfigSchema = z.object({
  allowCycles: z.boolean().default(true),
  enableOutputValidation: z.boolean().default(false),
})

export type VerificationConfig = z.infer<typeof VerificationConfigSchema>

// ============================================================================
// PERSISTENCE CONFIGURATION
// ============================================================================

export const PersistenceConfigSchema = z.object({
  useMockBackend: z.boolean().default(false),
  defaultBackend: z.enum(["memory", "supabase"]).default("supabase"),
})

export type PersistenceConfig = z.infer<typeof PersistenceConfigSchema>

// ============================================================================
// COMPLETE RUNTIME CONFIGURATION
// ============================================================================

export const CoordinationTypeSchema = z.enum(["sequential", "hierarchical"]).default("sequential")

export const RuntimeConfigSchema = z.object({
  coordinationType: CoordinationTypeSchema,
  newNodeProbability: z.number().min(0).max(1).default(0.7),
  models: ModelsConfigSchema.default({}),
  logging: LoggingConfigSchema.default({}),
  tools: ToolsConfigSchema.default({}),
  workflow: WorkflowExecutionConfigSchema.default({}),
  evolution: EvolutionConfigSchema.default({}),
  improvement: ImprovementConfigSchema.default({}),
  limits: LimitsConfigSchema.default({}),
  context: ContextConfigSchema.default({}),
  verification: VerificationConfigSchema.default({}),
  persistence: PersistenceConfigSchema.default({}),
})

export type CoordinationType = z.infer<typeof CoordinationTypeSchema>
export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>

// ============================================================================
// DEFAULT CONFIGURATIONS (extracted from schemas)
// ============================================================================

/**
 * Default runtime configuration.
 * Automatically extracted from Zod schemas - modify schemas, not this.
 */
export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = RuntimeConfigSchema.parse({})

/**
 * Merge partial config with defaults.
 * Deep merges, with override taking precedence.
 */
export function mergeRuntimeConfig(override: Partial<RuntimeConfig>): RuntimeConfig {
  return RuntimeConfigSchema.parse({
    ...DEFAULT_RUNTIME_CONFIG,
    ...override,
    models: override.models ? { ...DEFAULT_RUNTIME_CONFIG.models, ...override.models } : DEFAULT_RUNTIME_CONFIG.models,
    logging: override.logging
      ? { ...DEFAULT_RUNTIME_CONFIG.logging, ...override.logging }
      : DEFAULT_RUNTIME_CONFIG.logging,
    tools: override.tools ? { ...DEFAULT_RUNTIME_CONFIG.tools, ...override.tools } : DEFAULT_RUNTIME_CONFIG.tools,
    workflow: override.workflow
      ? { ...DEFAULT_RUNTIME_CONFIG.workflow, ...override.workflow }
      : DEFAULT_RUNTIME_CONFIG.workflow,
    evolution: override.evolution
      ? { ...DEFAULT_RUNTIME_CONFIG.evolution, ...override.evolution }
      : DEFAULT_RUNTIME_CONFIG.evolution,
    improvement: override.improvement
      ? { ...DEFAULT_RUNTIME_CONFIG.improvement, ...override.improvement }
      : DEFAULT_RUNTIME_CONFIG.improvement,
    limits: override.limits ? { ...DEFAULT_RUNTIME_CONFIG.limits, ...override.limits } : DEFAULT_RUNTIME_CONFIG.limits,
    context: override.context
      ? { ...DEFAULT_RUNTIME_CONFIG.context, ...override.context }
      : DEFAULT_RUNTIME_CONFIG.context,
    verification: override.verification
      ? { ...DEFAULT_RUNTIME_CONFIG.verification, ...override.verification }
      : DEFAULT_RUNTIME_CONFIG.verification,
    persistence: override.persistence
      ? { ...DEFAULT_RUNTIME_CONFIG.persistence, ...override.persistence }
      : DEFAULT_RUNTIME_CONFIG.persistence,
  })
}

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
 * Partial runtime configuration for overrides
 */
export const PartialRuntimeConfigSchema = RuntimeConfigSchema.deepPartial()
export type PartialRuntimeConfig = z.infer<typeof PartialRuntimeConfigSchema>

/**
 * Validate partial runtime configuration (for overrides)
 */
export function validatePartialRuntimeConfig(config: unknown): PartialRuntimeConfig {
  return PartialRuntimeConfigSchema.parse(config)
}
