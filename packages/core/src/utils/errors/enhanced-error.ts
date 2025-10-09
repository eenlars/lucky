/**
 * Enhanced error system with structured messaging for better user experience.
 *
 * Design principles:
 * - Cause clarity: What went wrong
 * - User action: How to fix it
 * - Traceability: Where it happened
 * - Reproducibility: How to debug
 *
 * Target: ≥90% of errors understandable in ≤60 seconds
 */

import { serializeError } from "./serialize-error"

export interface ActionButton {
  label: string
  handler: () => void | Promise<void>
}

export interface EnhancedErrorDebug {
  code: string
  context: Record<string, unknown>
  timestamp: string
  traceId?: string
}

export interface EnhancedErrorOptions {
  // User-facing fields
  title: string
  message: string
  action: string
  actionButton?: ActionButton

  // Technical details
  debug: EnhancedErrorDebug

  // Documentation
  docsUrl?: string

  // Retry configuration
  retryable: boolean
  retryStrategy?: "immediate" | "exponential" | "manual"
}

/**
 * Enhanced error class with rich metadata for explainability.
 */
export class EnhancedError extends Error {
  public readonly title: string
  public readonly userMessage: string
  public readonly action: string
  public readonly actionButton?: ActionButton
  public readonly debug: EnhancedErrorDebug
  public readonly docsUrl?: string
  public readonly retryable: boolean
  public readonly retryStrategy?: "immediate" | "exponential" | "manual"

  constructor(options: EnhancedErrorOptions) {
    super(options.message)
    this.name = "EnhancedError"
    this.title = options.title
    this.userMessage = options.message
    this.action = options.action
    this.actionButton = options.actionButton
    this.debug = options.debug
    this.docsUrl = options.docsUrl
    this.retryable = options.retryable
    this.retryStrategy = options.retryStrategy
  }

  /**
   * Serialize for logging/transport
   */
  toJSON() {
    return {
      name: this.name,
      title: this.title,
      message: this.userMessage,
      action: this.action,
      debug: {
        ...this.debug,
        // Never serialize function handlers
        actionButton: this.actionButton ? { label: this.actionButton.label } : undefined,
      },
      docsUrl: this.docsUrl,
      retryable: this.retryable,
      retryStrategy: this.retryStrategy,
    }
  }

  /**
   * Format for console/terminal display
   */
  toConsoleString(): string {
    const lines = [`❌ ${this.title}`, "", `Problem: ${this.userMessage}`, `Action: ${this.action}`]

    if (this.docsUrl) {
      lines.push(`Docs: ${this.docsUrl}`)
    }

    if (this.retryable) {
      lines.push(`Retryable: Yes (${this.retryStrategy || "manual"})`)
    }

    lines.push("", "Debug Info:")
    lines.push(`  Code: ${this.debug.code}`)
    lines.push(`  Time: ${this.debug.timestamp}`)
    if (this.debug.traceId) {
      lines.push(`  Trace: ${this.debug.traceId}`)
    }

    return lines.join("\n")
  }
}

/**
 * Convert legacy errors to enhanced errors
 */
export function enhanceError(error: unknown, code: string, traceId?: string): EnhancedError {
  if (error instanceof EnhancedError) {
    return error
  }

  if (error instanceof Error) {
    return new EnhancedError({
      title: "Error",
      message: error.message,
      action: "Check the error details and try again.",
      debug: {
        code,
        context: serializeError(error),
        timestamp: new Date().toISOString(),
        traceId,
      },
      retryable: true,
      retryStrategy: "manual",
    })
  }

  return new EnhancedError({
    title: "Unknown Error",
    message: String(error),
    action: "Check the logs for more information.",
    debug: {
      code,
      context: { error: String(error) },
      timestamp: new Date().toISOString(),
      traceId,
    },
    retryable: true,
    retryStrategy: "manual",
  })
}
