import { validateAndCorrectWithSchema } from "@/tools/constraintValidation"
import type { WorkflowFile } from "@/tools/context/contextStore.types"
import { R, type RS } from "@/utils/types"
import type { ExpectedOutputSchema } from "@/workflow/ingestion/ingestion.types"
import { TOOLS } from "@/runtime/settings/tools"
import type { CodeToolName } from "@tools/tool.types"
import { tool, type Tool } from "ai"
import { z, type ZodSchema, type ZodTypeAny } from "zod"

// toolcontext gives a tool extra information about
// some run settings that might otherwise not be available.
// quite handy!
export interface ToolExecutionContext {
  workflowInvocationId: string
  workflowFiles: WorkflowFile[]
  expectedOutputType: ExpectedOutputSchema | undefined
  mainWorkflowGoal: string
  workflowId: string
}

/**
 * Configuration for the unified tool creation function
 */
export interface DefineToolConfig<TParams = any, TResult = any> {
  name: CodeToolName
  params: ZodSchema<TParams>
  execute: (
    params: TParams,
    externalContext?: ToolExecutionContext
  ) => Promise<TResult> | TResult
}

/**
 * 🔧 The one way to create tools!
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
 * Convert a tool definition to the AI framework Tool type
 */
export function toAITool<ParamsSchema extends ZodTypeAny, TResult>(
  toolDef: ReturnType<typeof defineTool<ParamsSchema, TResult>>,
  toolExecutionContext: ToolExecutionContext
): Tool {
  return tool({
    description: toolDef.description,
    parameters: toolDef.parameters,
    execute: async (params: z.infer<ParamsSchema>) => {
      // Apply schema-based validation and auto-correction using the tool's own Zod schema
      const {
        params: correctedParams,
        corrected,
        warnings,
      } = validateAndCorrectWithSchema(
        toolDef.name,
        params,
        toolDef.parameters // Use the tool's Zod schema as single source of truth
      )

      // Log any auto-corrections for debugging
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

      return result.data
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
