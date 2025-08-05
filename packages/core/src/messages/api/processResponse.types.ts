import type { NodeLogs } from "@messages/api/processResponse"
import { isNir } from "@utils/common/isNir"

// this is the language of how nodes interact with each other.

/**
 * Represents the outcome of processing a model response.
 * Uses discriminated unions for type-safe pattern matching.
 */
export type ProcessedResponse = TextProcessed | ToolProcessed | ErrorProcessed
export type ProcessedResponseWithSummary = ProcessedResponse & {
  readonly summary: string
}

// Make nodeId required
interface AnyProcessed {
  readonly nodeId: string
  readonly cost: number
  readonly toolUsage: NodeLogs<any>
  readonly summary?: string
}

export interface TextProcessed extends AnyProcessed {
  readonly type: "text"
  readonly content: string
  readonly learnings?: string
}

export interface ToolProcessed extends AnyProcessed {
  readonly type: "tool"
  readonly toolUsage: NodeLogs<any>
  readonly learnings?: string
}

export interface ErrorProcessed extends AnyProcessed {
  readonly type: "error"
  readonly message: string
  readonly details?: unknown
  readonly learnings?: string
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
  !!data &&
  typeof data === "object" &&
  !isNir(data) &&
  "type" in data &&
  (data as { type: string }).type === "tool"

export const isErrorProcessed = (data: unknown): data is ErrorProcessed =>
  !!data &&
  typeof data === "object" &&
  !isNir(data) &&
  "type" in data &&
  (data as { type: string }).type === "error"
