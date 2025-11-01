/**
 * Evaluation input contracts for workflow ingestion.
 * Defines all supported input formats for running and evaluating workflows.
 */

import { z } from "zod"

/**
 * Resolves encrypted secrets from the user's lockbox.
 *
 * @example
 * const resolver = createSecretResolver(clerkId)
 * const openaiKey = await resolver.get("OPENAI_API_KEY", "environment-variables")
 * const allKeys = await resolver.getAll(["OPENAI_API_KEY", "GROQ_API_KEY"], "environment-variables")
 */
export type SecretResolver = {
  /**
   * Get a single secret by its key name
   * @param secretKeyName - The secret key name (e.g., "OPENAI_API_KEY")
   * @param namespace - Optional namespace (e.g., "environment-variables")
   */
  get(secretKeyName: string, namespace?: string): Promise<string | undefined>

  /**
   * Get multiple secrets by their key names
   * @param secretKeyNames - Array of secret key names (e.g., ["OPENAI_API_KEY", "GROQ_API_KEY"])
   * @param namespace - Optional namespace (e.g., "environment-variables")
   * @returns Record of key names to decrypted values (e.g., { "OPENAI_API_KEY": "sk-..." })
   */
  getAll(secretKeyNames: string[], namespace?: string): Promise<Record<string, string>>
}

// ============================================================================
// OUTPUT SCHEMA (for validation)
// ============================================================================

export const OutputSchemaSchema = z.object({
  type: z.enum(["object", "string", "array", "number", "boolean"]),
  properties: z.record(z.any()).optional(),
  required: z.array(z.string()).optional(),
  items: z.any().optional(),
  description: z.string().optional(),
})

export type OutputSchema = z.infer<typeof OutputSchemaSchema>

// ============================================================================
// MAIN GOAL (shared by all evaluation inputs)
// ============================================================================

const MainGoalSchema = z.object({
  goal: z.string(),
  workflowId: z.string(),
})

// ============================================================================
// EVALUATION INPUT TYPES
// ============================================================================

/**
 * Plain text Q/A evaluation input
 */
export const EvaluationTextSchema = MainGoalSchema.extend({
  type: z.literal("text"),
  question: z.string(),
  answer: z.string(),
  outputSchema: OutputSchemaSchema.optional(),
})

/**
 * CSV-backed evaluation input definition
 */
export const EvaluationCSVSchema = MainGoalSchema.extend({
  type: z.literal("csv"),
  evaluation: z
    .string()
    .regex(/^column:.+/)
    .optional(),
  inputFile: z.string().optional(),
  outputSchema: OutputSchemaSchema.optional(),
  onlyIncludeInputColumns: z.array(z.string()).optional(),
})

/**
 * Prompt-only input; used when no ground-truth evaluation is needed
 */
export const PromptOnlySchema = MainGoalSchema.extend({
  type: z.literal("prompt-only"),
  outputSchema: z.never().optional(),
})

/**
 * MCP JSON-RPC invocation input; supports structured data with schema validation
 */
export const MCPInvokeInputSchema = MainGoalSchema.extend({
  type: z.literal("mcp-invoke"),
  inputData: z.unknown(),
  inputSchema: OutputSchemaSchema.optional(),
  outputSchema: OutputSchemaSchema.optional(),
})

/**
 * SWE-bench evaluation input
 */
export const SWEBenchInputSchema = MainGoalSchema.extend({
  type: z.literal("swebench"),
  outputSchema: OutputSchemaSchema.optional(),
})

/**
 * GAIA evaluation input referencing a dataset task
 */
export const GAIAInputSchema = MainGoalSchema.extend({
  type: z.literal("gaia"),
  taskId: z.string(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  split: z.enum(["validation", "test"]).optional(),
  outputSchema: OutputSchemaSchema.optional(),
})

/**
 * WebArena evaluation input definition
 */
export const WebArenaInputSchema = MainGoalSchema.extend({
  type: z.literal("webarena"),
  taskId: z.number().int().optional(),
  sites: z.array(z.string()).optional(),
  limit: z.number().int().optional(),
  outputSchema: OutputSchemaSchema.optional(),
})

/**
 * Dataset record evaluation input definition
 */
export const DatasetRecordInputSchema = MainGoalSchema.extend({
  type: z.literal("dataset-records"),
  recordIds: z.array(z.string()),
  outputSchema: OutputSchemaSchema.optional(),
})

/**
 * Union of all supported evaluation input formats
 */
export const EvaluationInputSchema = z.discriminatedUnion("type", [
  EvaluationTextSchema,
  EvaluationCSVSchema,
  PromptOnlySchema,
  MCPInvokeInputSchema,
  SWEBenchInputSchema,
  GAIAInputSchema,
  WebArenaInputSchema,
  DatasetRecordInputSchema,
])

export type EvaluationText = z.infer<typeof EvaluationTextSchema>
export type EvaluationCSV = z.infer<typeof EvaluationCSVSchema>
export type PromptOnly = z.infer<typeof PromptOnlySchema>
export type MCPInvokeInput = z.infer<typeof MCPInvokeInputSchema>
export type SWEBenchInput = z.infer<typeof SWEBenchInputSchema>
export type GAIAInput = z.infer<typeof GAIAInputSchema>
export type WebArenaInput = z.infer<typeof WebArenaInputSchema>
export type DatasetRecordInput = z.infer<typeof DatasetRecordInputSchema>

export type EvaluationInput = z.infer<typeof EvaluationInputSchema>

// ============================================================================
// WORKFLOW IO (single input/output case)
// ============================================================================

export const WorkflowIOSchema = z.object({
  workflowInput: z.string(),
  workflowOutput: z.object({
    output: z.any(),
    outputSchema: OutputSchemaSchema.optional(),
  }),
})

export type WorkflowIO = z.infer<typeof WorkflowIOSchema>

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * True if the input type implies an evaluation phase is possible
 */
export const hasGroundTruth = (evaluation: EvaluationInput): boolean => {
  switch (evaluation.type) {
    case "prompt-only":
    case "mcp-invoke":
      return false
    case "text":
      return (evaluation.answer ?? "").trim().length > 0
    case "csv":
      return typeof evaluation.evaluation === "string" && evaluation.evaluation.trim().length > 0
    case "gaia":
    case "swebench":
    case "webarena":
    case "dataset-records":
      return true
  }
}

/**
 * True if the input type requires evaluation
 */
export const needsEvaluation = (evaluation: EvaluationInput) => hasGroundTruth(evaluation)

/**
 * Function type for converting evaluation inputs into workflow IO cases
 */
export type EvaluationToWorkflowIO = (evaluations: EvaluationInput) => WorkflowIO[]

// ============================================================================
// DATASET INSTANCE TYPES (for specific benchmarks)
// ============================================================================

export interface GAIAInstance {
  task_id: string
  Question: string
  Level: number
  "Final answer"?: string
  file_name?: string
  file_content?: string | Buffer
}

export interface SWEBenchInstance {
  instance_id: string
  problem_statement: string
  text: string
  repo: string
  base_commit: string
  patch: string
  test_patch?: string | null
}

export interface WebArenaInstance {
  task_id: number
  sites: string[]
  intent_template: string
  intent: string
  require_login: boolean
  eval: {
    eval_types: string[]
    reference_answers: {
      exact_match?: string
      must_include?: string[]
      fuzzy_match?: string[]
    }
  }
}

/**
 * Validate evaluation input with detailed error messages
 */
export function validateEvaluationInput(input: unknown): EvaluationInput {
  return EvaluationInputSchema.parse(input)
}

/**
 * Safe validation that returns result object
 */
export function safeValidateEvaluationInput(input: unknown) {
  return EvaluationInputSchema.safeParse(input)
}
