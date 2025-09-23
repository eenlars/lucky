/**
 * Configuration for Claude Code SDK integration.
 * Minimal settings for pluggable SDK service.
 */

export const CLAUDE_SDK_CONFIG = {
  // Enable SDK globally (can be overridden per node)
  enabled: false,
  
  // Default model for SDK operations
  defaultModel: "sonnet" as "opus" | "sonnet" | "haiku",
  
  // Default timeout in milliseconds
  defaultTimeout: 60000,
  
  // Skip permission prompts by default
  skipPermissions: true,
  
  // Tools allowed by default for SDK nodes
  defaultAllowedTools: [
    "Read",
    "Write",
    "Edit",
    "Grep",
    "Glob"
  ],
  
  // Debug mode for SDK operations
  debug: false
} as const