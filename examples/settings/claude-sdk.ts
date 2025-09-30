/**
 * Configuration for official Anthropic SDK integration.
 * Minimal settings for pluggable SDK service.
 */

export const CLAUDE_SDK_CONFIG = {
  // Enable SDK globally (can be overridden per node)
  enabled: false,

  // Default model for SDK operations
  // Options: "opus", "sonnet", "haiku", "opus-3", "sonnet-3", "sonnet-3.5", "haiku-3"
  defaultModel: "sonnet" as const,

  // Default max tokens to generate
  defaultMaxTokens: 4096,

  // Default timeout in milliseconds
  defaultTimeout: 60000,

  // Default temperature (0-1, where 0 is most deterministic)
  defaultTemperature: 0.7,

  // Default top-p sampling parameter
  defaultTopP: undefined as number | undefined,

  // Debug mode for SDK operations
  debug: false,

  // Note: The official SDK requires ANTHROPIC_API_KEY environment variable
} as const
