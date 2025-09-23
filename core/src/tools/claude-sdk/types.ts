/**
 * Type definitions for Claude Code SDK integration.
 * Keeping types separate enables clean ejection - just delete the SDK folder.
 */

/**
 * Configuration options for Claude SDK execution.
 * Maps to the SDK's fluent API configuration.
 */
export interface ClaudeSDKConfig {
  /** Model to use for SDK operations */
  model?: "opus" | "sonnet" | "haiku"

  /** Tools the SDK is allowed to use */
  allowedTools?: string[]

  /** Skip permission prompts for tool usage */
  skipPermissions?: boolean

  /** Execution timeout in milliseconds */
  timeout?: number
}

/**
 * Version compatibility for SDK integration.
 * Used to ensure the installed SDK version is compatible.
 */
export const SDK_VERSION = {
  /** Minimum compatible version */
  minVersion: "0.3.0",

  /** Maximum compatible version (inclusive) */
  maxVersion: "0.4.0",

  /** Current integration version */
  integrationVersion: "1.0.0",
} as const
