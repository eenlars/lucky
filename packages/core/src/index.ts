// Core autonomous workflow system exports

// Types & Interfaces
export * from './types'
export * from './interfaces'

// Main entry points with dependency injection
export { runEvolution, type EvolutionOptions } from './runEvolution'
export { runOnceCore } from './runOnceCore'

// Workflow ingestion types
export type { EvaluationInput, WorkflowIO } from '@workflow/ingestion/ingestion.types'

// Legacy entry points (for backwards compatibility)
export { default as runEvolutionLegacy } from './main'
export { runOnce } from './runOnce'

// Workflow system
export { Workflow } from '@workflow/Workflow'
export * from '@workflow/schema/workflow.types'
export * from '@workflow/schema/workflowSchema'

// Evolution & Improvement
export { EvolutionEngine } from '@improvement/gp/evolutionengine'
export { AggregatedEvaluator } from '@improvement/evaluators/AggregatedEvaluator'
export { Genome } from '@improvement/gp/Genome'
export { Population } from '@improvement/gp/Population'

// Tools system
export { defineTool } from '@tools/toolFactory'
export * from '@tools/tool.types'
export { CodeToolRegistry } from '@tools/code/CodeToolRegistry'

// Node system
export { WorkFlowNode } from '@node/WorkFlowNode'
export { InvocationPipeline } from '@node/InvocationPipeline'

// Messages
export { WorkflowMessage } from '@messages/WorkflowMessage'
export * from '@messages/api/sendAI'

// Utilities
export * from '@/utils/common/llmify'
export * from '@/utils/common/parallelLimit'
export * from '@/utils/file-types/json/jsonParse'
export { SpendingTracker } from '@/utils/spending/SpendingTracker'

// Prompts (for customization)
export * from '@prompts/standardPrompt'