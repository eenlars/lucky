/**
 * Type definitions for the sendAI module.
 *
 * This module defines all the types used across the sendAI system,
 * including request types, response formats, and utility types.
 *
 * @module sendAI/types
 */

// TODO: add comprehensive JSDoc for all exported types
// TODO: create union type for all request types
// TODO: add validation schemas for runtime type checking
// TODO: implement type guards for request discrimination
// TODO: add metadata types for tracing and debugging
// TODO: create error code enumerations
// TODO: add performance metrics types
// TODO: implement request/response serialization types

import type { ModelName } from "@core/utils/spending/models.types"
import type {
  CoreMessage,
  GenerateTextResult,
  LanguageModelV1,
  StepResult,
  ToolChoice,
  ToolSet,
} from "ai"
import type { Schema, ZodTypeAny } from "zod"

/**
 * Standardized response format for all sendAI operations.
 *
 * Uses discriminated union pattern to ensure type safety between
 * successful and failed responses. All responses include debug
 * information for troubleshooting.
 *
 * @template T - The expected data type for successful responses
 */
// TODO: add response metadata (timing, model version, etc.)
// TODO: implement response compression for large payloads
// TODO: add response validation against expected schemas
export type TResponse<T> =
  | {
      success: true
      data: T
      summary?: string
      usdCost: number
      error: null
      debug_input: CoreMessage[]
      debug_output: any
    }
  | {
      success: false
      data: null
      summary?: string
      usdCost?: number
      error: string
      debug_input: CoreMessage[]
      debug_output: any
    }

/**
 * Function type for preparing tool execution steps.
 *
 * Used in multi-step tool operations to configure the next step
 * based on previous results and execution context.
 *
 * @template T - The tool set type
 * @template M - The language model type
 */
// TODO: add step preparation validation
// TODO: implement step caching for repeated patterns
// TODO: add step execution metrics
export type PreparedStepsFunction<
  T extends ToolSet = ToolSet,
  M extends LanguageModelV1 = LanguageModelV1,
> = (o: {
  steps: StepResult<T>[]
  stepNumber: number
  maxSteps: number
  model: M
}) => PromiseLike<
  | {
      model?: M
      toolChoice?: ToolChoice<T>
      experimental_activeTools?: (keyof T)[]
    }
  | undefined
>

/**
 * Base interface for all sendAI request types.
 *
 * Contains common properties shared across text, tool, and structured requests.
 * Provides optional configuration for debugging, retries, and execution options.
 */
// TODO: add request timeout configuration
// TODO: implement request priority levels
// TODO: add request correlation tracking
interface RequestBase {
  messages: CoreMessage[]
  debug?: boolean
  model?: ModelName
  retries?: number
  opts?: {
    saveOutputs?: boolean
    maxSteps?: number
    reasoning?: boolean
  }
}

/**
 * Request type for simple text generation.
 *
 * Used when only text output is needed without tool use or structured data.
 * Supports all common AI model capabilities like reasoning and debugging.
 */
// TODO: add text generation configuration options (temperature, etc.)
// TODO: implement text output formatting options
export interface TextRequest extends RequestBase {
  mode: "text"
}

/**
 * Request type for AI operations involving tool use.
 *
 * Enables the AI to call functions and tools during generation.
 * Includes repair mode for automatic error recovery.
 */
// TODO: add tool execution timeout configuration
// TODO: implement tool result validation
// TODO: add tool usage analytics
export interface ToolRequest extends RequestBase {
  mode: "tool"
  opts: RequestBase["opts"] & {
    tools: ToolSet
    toolChoice?: ToolChoice<ToolSet>
    repair?: boolean
  }
}

/**
 * Request type for structured data generation.
 *
 * Uses Zod schemas or JSON schemas to ensure the AI output conforms
 * to a specific structure. Supports both object and array outputs.
 *
 * @template S - The schema type for output validation
 */
// TODO: add schema validation error handling
// TODO: implement schema evolution and versioning
// TODO: add output post-processing hooks
export interface StructuredRequest<S extends ZodTypeAny | Schema<any>>
  extends RequestBase {
  mode: "structured"
  schema: S
  output?: "object" | "array"
  enum?: readonly string[]
}

/**
 * Main sendAI function interface with overloads for different request types.
 *
 * Provides type-safe interactions for text, tool, and structured requests
 * with appropriate return types inferred from the request mode.
 */
// TODO: add batch request support
// TODO: implement request middleware system
// TODO: add request/response transformation hooks
export type SendAI = (<S extends ZodTypeAny>(
  req: StructuredRequest<S>
) => Promise<TResponse<import("zod").infer<S>>>) &
  ((req: ToolRequest) => Promise<TResponse<GenerateTextResult<ToolSet, any>>>) &
  ((
    req: TextRequest
  ) => Promise<TResponse<{ text: string; reasoning?: string }>>)
