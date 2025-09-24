/**
 * Unified tool framework for code and MCP tool integration.
 *
 * ## Runtime Architecture
 *
 * Provides a single interface for defining and executing tools with:
 * - Type-safe parameter validation via Zod schemas
 * - Automatic parameter correction for common AI mistakes
 * - Context propagation to tools (workflow ID, files, goals)
 * - Error handling and result wrapping
 *
 * ## Tool Definition Pattern
 *
 * All tools follow the same pattern:
 * 1. Define parameters with Zod schema
 * 2. Implement execute function with typed params
 * 3. Convert to AI framework format for runtime use
 *
 * ## Runtime Flow
 *
 * 1. AI generates tool call with parameters
 * 2. Parameters validated and auto-corrected
 * 3. Tool executed with workflow context
 * 4. Result wrapped in success/error envelope
 * 5. Response returned to AI for processing
 *
 * @module tools/toolFactory
 */

import Tools from "@core/tools/code/output.types"
import { validateAndCorrectWithSchema } from "@core/tools/constraintValidation"
import type { WorkflowFile } from "@core/tools/context/contextStore.types"
import type { CodeToolName } from "@core/tools/tool.types"
import { R, type RS } from "@core/utils/types"
import type { OutputSchema } from "@core/workflow/ingestion/ingestion.types"
import { TOOLS } from "@runtime/settings/tools"
import { tool, zodSchema, type Tool } from "ai"
import { z, type ZodSchema, type ZodTypeAny } from "zod"

// tool context provides runtime information about workflow execution
// this enables tools to access files, understand goals, and coordinate
export interface ToolExecutionContext {
  workflowId: string
  workflowVersionId: string
  workflowInvocationId: string
  workflowFiles: WorkflowFile[]
  expectedOutputType: OutputSchema | undefined
  mainWorkflowGoal: string
}
export type InvocationContext = ToolExecutionContext

/**
 * Configuration for the unified tool creation function
 */
export interface DefineToolConfig<TParams = any, TResult = any> {
  name: CodeToolName
  params: ZodSchema<TParams>
  execute: (
    params: TParams,
    externalContext: ToolExecutionContext
  ) => Promise<TResult> | TResult
}

/**
 * 🔧 The unified way to create tools with type safety and validation.
 *
 * Runtime behavior:
 * 1. Validates input parameters against Zod schema
 * 2. Executes tool function with validated params and context
 * 3. Wraps result in success/error envelope for consistent handling
 *
 * @param config Tool configuration with name, params schema, and execute function
 * @returns Tool definition ready for AI framework integration
 *
 * @example
 * const searchTool = defineTool({
 *   name: "search",
 *   params: z.object({ query: z.string() }),
 *   execute: async (params, ctx) => {
 *     // params are fully typed and validated
 *     return await performSearch(params.query)
 *   }
 * })
 */
export function defineTool<
  Schema extends ZodTypeAny, // the schema we get
  TResult, // what `execute` returns
>(config: {
  name: CodeToolName
  description?: string
  params: Schema
  execute: (
    params: z.infer<Schema>, // already validated
    externalContext: ToolExecutionContext
  ) => Promise<TResult> | TResult
}) {
  /* Helper aliases – purely for readability */
  type InputParams = z.input<Schema> // what callers pass in
  type OutputParams = z.infer<Schema> // what your handler sees
  type FinalResult = Awaited<TResult>

  return {
    name: config.name,
    description:
      config.description ?? TOOLS.code[config.name] ?? "No description",
    parameters: config.params,

    async execute(
      params: InputParams,
      externalContext: ToolExecutionContext
    ): Promise<RS<FinalResult>> {
      try {
        /* 1) runtime validation + 2) guarantees OutputParams type afterwards */
        const parsed: OutputParams = config.params.parse(params)

        /* user-supplied handler */
        const result = await config.execute(parsed, externalContext)

        return R.success(result, 0)
      } catch (err) {
        return R.error(err instanceof Error ? err.message : String(err), 0)
      }
    },
  }
}

/**
 * Convert a tool definition to the AI framework Tool type.
 *
 * ## Runtime Processing
 *
 * 1. **Parameter Validation**: AI-generated params validated against schema
 * 2. **Auto-Correction**: Common AI mistakes corrected automatically
 *    - Missing required fields filled with defaults
 *    - Type mismatches coerced when possible
 *    - Invalid values replaced with nearest valid option
 * 3. **Execution**: Tool runs with corrected params and context
 * 4. **Error Handling**: Failures return error messages, not exceptions
 *
 * ## Auto-Correction Examples
 *
 * - `null` → default value for optional params
 * - String numbers → parsed numbers
 * - Missing array → empty array
 * - Invalid enum → first valid option
 *
 * @param toolDef Tool definition from defineTool
 * @param toolExecutionContext Runtime context for tool execution
 * @returns AI framework compatible tool
 */
export function toAITool<ParamsSchema extends ZodTypeAny, TResult>(
  toolDef: ReturnType<typeof defineTool<ParamsSchema, TResult>>,
  toolExecutionContext: ToolExecutionContext
): Tool {
  return tool({
    description: toolDef.description,
    inputSchema: zodSchema(toolDef.parameters),
    execute: async (params: z.infer<ParamsSchema>) => {
      // apply schema-based validation and auto-correction using the tool's own Zod schema
      const {
        params: correctedParams,
        corrected,
        warnings,
      } = validateAndCorrectWithSchema(
        toolDef.name,
        params,
        toolDef.parameters // use the tool's Zod schema as single source of truth
      )

      // log any auto-corrections for debugging
      if (corrected) {
        console.log(`Auto-corrected parameters for ${toolDef.name}:`, {
          original: params,
          corrected: correctedParams,
          warnings,
        })
      }

      const result = await toolDef.execute(
        correctedParams,
        toolExecutionContext
      )

      if (!result.success) {
        return result.error || "Tool execution failed"
      }

      // Unwrap CodeToolResult for AI runtime: return only the tool output
      return Tools.isCodeToolResult(result.data)
        ? (result.data as { output: unknown }).output
        : result.data
    },
  })
}

/**
 * Common parameter schemas for reuse
 * Keep minimal - only the most universally useful schemas
 */
export const commonSchemas = {
  query: z.string().describe("Search query or input text"),
  filePath: z.string().describe("File path for saving or loading"),
  data: z.string().describe("Data content to process"),
  resultCount: z
    .number()
    .describe("Number of results to return")
    .max(20)
    .default(10)
    .nullish(),
} as const
