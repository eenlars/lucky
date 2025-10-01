/**
 * Type definitions for official Anthropic SDK integration.
 * Keeping types separate enables clean ejection - just delete the SDK folder.
 */

/**
 * Configuration options for Anthropic SDK execution.
 * Maps to the official SDK's API parameters.
 */
export interface ClaudeSDKConfig {
  /** Model to use for SDK operations */
  model?:
    | "sonnet"
    | "opus"
    | "haiku"
    | "sonnet-4.5"
    | "opus-4.1"
    | "opus-4"
    | "sonnet-4"
    | "sonnet-3.7"
    | "sonnet-3.5"
    | "haiku-3.5"
    | "sonnet-3.5-old"
    | "haiku-3"
    | "opus-3"

  /** Maximum tokens to generate */
  maxTokens?: number

  /** Temperature for response generation (0-1) */
  temperature?: number

  /** Top-p sampling parameter */
  topP?: number

  /** Execution timeout in milliseconds */
  timeout?: number

  /** System prompt (will be prepended to user message) */
  systemPrompt?: string

  /** Enable tool/function calling support */
  enableTools?: boolean

  /** Maximum number of retries for failed requests */
  maxRetries?: number
}

/**
 * Version compatibility for SDK integration.
 * Tracks the integration version (not SDK version).
 */
export const SDK_VERSION = {
  /** Current integration version */
  integrationVersion: "2.0.0",

  /** Official SDK package name */
  packageName: "@anthropic-ai/sdk",
} as const

/**
 * Model pricing information (per million tokens).
 * Updated as of December 2024.
 */
export const MODEL_PRICING = {
  "claude-3-opus": { input: 15.0, output: 75.0 },
  "claude-3-5-sonnet": { input: 3.0, output: 15.0 },
  "claude-3-sonnet": { input: 3.0, output: 15.0 },
  "claude-3-haiku": { input: 0.25, output: 1.25 },
} as const
