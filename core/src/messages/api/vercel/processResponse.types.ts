import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import { isNir } from "@core/utils/common/isNir"

// this is the language of how nodes interact with each other.

/**
 * Represents the outcome of processing a model response.
 * Uses discriminated unions for type-safe pattern matching.
 */
/**
 * Union of processed response variants after normalizing raw provider output.
 */
export type ProcessedResponse = TextProcessed | ToolProcessed | ErrorProcessed
/** Processed response that is guaranteed to carry a summary. */
export type ProcessedResponseWithSummary = ProcessedResponse & {
  readonly summary: string
}

// Make nodeId required
/**
 * Base interface shared by processed responses.
 */
interface AnyProcessed {
  readonly nodeId: string
  readonly cost: number
  readonly agentSteps: AgentSteps
  readonly summary?: string
}

/**
 * Normalized text response (no tools called).
 */
export interface TextProcessed extends AnyProcessed {
  readonly type: "text"
  readonly content: string
  readonly learnings?: string
}

/**
 * Normalized tool response (one or more tool calls captured in steps).
 */
export interface ToolProcessed extends AnyProcessed {
  readonly type: "tool"
  readonly learnings?: string
}

/**
 * Normalized error outcome when provider output could not be interpreted.
 */
export interface ErrorProcessed extends AnyProcessed {
  readonly type: "error"
  readonly message: string
  readonly details?: unknown
  readonly learnings?: string
  readonly originatedFrom?: string
}

/**
 * Type guard to check if response contains text content
 */
export const isVercelTextResponse = (data: unknown): data is { text: string } =>
  !!data &&
  typeof data === "object" &&
  typeof (data as { text: string }).text === "string" &&
  (data as { text: string }).text.trim().length > 0 // Only consider non-empty text

export const isTextProcessed = (data: unknown): data is TextProcessed =>
  !!data &&
  typeof data === "object" &&
  !isNir(data) &&
  "type" in data &&
  (data as { type: string }).type === "text" &&
  "content" in data &&
  typeof (data as { content: string }).content === "string" &&
  (data as { content: string }).content.trim().length > 0 &&
  "cost" in data &&
  typeof (data as { cost: number }).cost === "number"

export const isToolProcessed = (data: unknown): data is ToolProcessed =>
  !!data && typeof data === "object" && !isNir(data) && "type" in data && (data as { type: string }).type === "tool"

export const isErrorProcessed = (data: unknown): data is ErrorProcessed =>
  !!data && typeof data === "object" && !isNir(data) && "type" in data && (data as { type: string }).type === "error"
