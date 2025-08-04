// Core autonomous workflow system exports

// Types & Interfaces
export * from "./interfaces"
export * from "./interfaces/runtimeConfig"

// Main entry points with dependency injection
export { runEvolution, type EvolutionOptions } from "./runEvolution"
export { runOnceCore } from "./runOnceCore"

// Workflow ingestion types
export type {
  EvaluationInput,
  WorkflowIO,
} from "@workflow/ingestion/ingestion.types"

// Legacy entry points (for backwards compatibility)
export { default as runEvolutionLegacy } from "./main"
export { runOnce } from "./runOnce"

// Workflow system
export * from "@workflow/schema/workflow.types"
export * from "@workflow/schema/workflowSchema"
export { Workflow } from "@workflow/Workflow"

// Evolution & Improvement
export { AggregatedEvaluator } from "@improvement/evaluators/AggregatedEvaluator"
export { EvolutionEngine } from "@improvement/gp/evolutionengine"
export { Genome } from "@improvement/gp/Genome"
export { Population } from "@improvement/gp/Population"

// Tools system
export { CodeToolRegistry } from "@tools/code/CodeToolRegistry"
export * from "@tools/tool.types"
export { defineTool } from "@tools/toolFactory"

// Node system
export { InvocationPipeline } from "@node/InvocationPipeline"
export { WorkFlowNode } from "@node/WorkFlowNode"

// Messages
export * from "@messages/api/sendAI"
export { WorkflowMessage } from "@messages/WorkflowMessage"

// Utilities
export * from "@/utils/common/llmify"
export * from "@/utils/common/parallelLimit"
export * from "@/utils/file-types/json/jsonParse"
export { SpendingTracker } from "@/utils/spending/SpendingTracker"

// Prompts (for customization)
export * from "@prompts/standardPrompt"
