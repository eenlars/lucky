/**
 * Runtime configuration contract for workflow execution.
 * RE-EXPORTS from config.ts for backward compatibility.
 *
 * MIGRATION: This file now re-exports from config.ts.
 * All new code should import directly from '@lucky/contracts/config'
 */

// Re-export everything from config.ts
export * from "./config"

// Backward compatibility: export schema names that may have been imported
export {
  RuntimeConfigSchema,
  PartialRuntimeConfigSchema,
  ModelProviderSchema,
  CoordinationTypeSchema,
  LogLevelSchema,
  HandoffContentSchema,
  PrepareProblemMethodSchema,
  ImprovementTypeSchema,
  // Note: ModelDefaultsSchema removed - model defaults now in @lucky/models
  ModelsConfigSchema,
  LoggingConfigSchema,
  ToolsConfigSchema,
  WorkflowExecutionConfigSchema as WorkflowConfigSchema,
  FitnessWeightsSchema,
  FitnessConfigSchema,
  ImprovementFlagsSchema,
  ImprovementConfigSchema,
  LimitsConfigSchema,
  ContextConfigSchema,
  VerificationConfigSchema,
  PersistenceConfigSchema,
} from "./config"
