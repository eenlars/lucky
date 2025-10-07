/**
 * Observability Layer - Structured logging for model operations
 *
 * Logs all model operations with full context:
 * - Selection decisions (why this model?)
 * - Costs and token usage
 * - Errors and fallbacks
 * - Performance metrics
 *
 * Log format is structured for easy parsing and analysis.
 *
 * @module observability/logger
 */

import type { SelectionOptions } from "../facade"
import type { SelectionReason } from "../selector/policy-selector"

/**
 * Log levels
 */
export type LogLevel = "debug" | "info" | "warn" | "error"

/**
 * Selection log entry
 */
export interface SelectionLog {
  timestamp: number
  level: LogLevel
  event: "model_selected"

  // Selection details
  modelId: string
  provider: string
  priceVersion: string

  // Selection reasoning
  reason: SelectionReason

  // Request context
  intent: string
  options: SelectionOptions

  // Timing
  durationMs: number

  // User context (if available)
  userId?: string
  requestId?: string
  metadata?: Record<string, unknown>
}

/**
 * Cost log entry
 */
export interface CostLog {
  timestamp: number
  level: LogLevel
  event: "cost_calculated"

  // Model info
  modelId: string
  provider: string
  priceVersion: string

  // Usage
  inputTokens: number
  outputTokens: number
  cachedTokens?: number

  // Cost breakdown
  inputCost: number
  outputCost: number
  cachedCost?: number
  totalCost: number

  // Request context
  userId?: string
  requestId?: string
}

/**
 * Error log entry
 */
export interface ErrorLog {
  timestamp: number
  level: LogLevel
  event: "model_error" | "selection_error"

  // Error details
  error: string
  errorType: string
  stack?: string

  // Context
  modelId?: string
  provider?: string
  intent?: string
  options?: SelectionOptions

  // Request context
  userId?: string
  requestId?: string
}

/**
 * Fallback log entry
 */
export interface FallbackLog {
  timestamp: number
  level: LogLevel
  event: "fallback_triggered"

  // Fallback details
  primaryModelId: string
  fallbackModelId: string
  reason: string

  // Request context
  userId?: string
  requestId?: string
}

/**
 * Performance log entry
 */
export interface PerformanceLog {
  timestamp: number
  level: LogLevel
  event: "performance"

  // Performance metrics
  operation: string
  durationMs: number
  success: boolean

  // Context
  modelId?: string
  provider?: string
}

/**
 * Union type of all log entries
 */
export type LogEntry = SelectionLog | CostLog | ErrorLog | FallbackLog | PerformanceLog

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel

  /** Enable console output */
  enableConsole: boolean

  /** Enable structured JSON output */
  enableJson: boolean

  /** Custom log handler */
  customHandler?: (entry: LogEntry) => void

  /** Sample rate (0-1) for high-volume logs */
  sampleRate?: number
}

/**
 * Model Operations Logger
 */
export class ModelLogger {
  private config: LoggerConfig

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: config.minLevel || "info",
      enableConsole: config.enableConsole !== false,
      enableJson: config.enableJson !== false,
      customHandler: config.customHandler,
      sampleRate: config.sampleRate || 1.0,
    }
  }

  /**
   * Log model selection
   */
  logSelection(log: Omit<SelectionLog, "timestamp" | "level" | "event">): void {
    const entry: SelectionLog = {
      timestamp: Date.now(),
      level: "info",
      event: "model_selected",
      ...log,
    }

    this.emit(entry)
  }

  /**
   * Log cost calculation
   */
  logCost(log: Omit<CostLog, "timestamp" | "level" | "event">): void {
    const entry: CostLog = {
      timestamp: Date.now(),
      level: "info",
      event: "cost_calculated",
      ...log,
    }

    this.emit(entry)
  }

  /**
   * Log error
   */
  logError(
    error: Error,
    context: {
      event?: "model_error" | "selection_error"
      modelId?: string
      provider?: string
      intent?: string
      options?: SelectionOptions
      userId?: string
      requestId?: string
    },
  ): void {
    const entry: ErrorLog = {
      timestamp: Date.now(),
      level: "error",
      event: context.event || "model_error",
      error: error.message,
      errorType: error.name,
      stack: error.stack,
      ...context,
    }

    this.emit(entry)
  }

  /**
   * Log fallback
   */
  logFallback(log: Omit<FallbackLog, "timestamp" | "level" | "event">): void {
    const entry: FallbackLog = {
      timestamp: Date.now(),
      level: "warn",
      event: "fallback_triggered",
      ...log,
    }

    this.emit(entry)
  }

  /**
   * Log performance metric
   */
  logPerformance(log: Omit<PerformanceLog, "timestamp" | "level" | "event">): void {
    const entry: PerformanceLog = {
      timestamp: Date.now(),
      level: "debug",
      event: "performance",
      ...log,
    }

    this.emit(entry)
  }

  /**
   * Update configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Emit log entry
   */
  private emit(entry: LogEntry): void {
    // Check log level
    if (!this.shouldLog(entry.level)) {
      return
    }

    // Apply sampling
    if (this.config.sampleRate && this.config.sampleRate < 1.0) {
      if (Math.random() > this.config.sampleRate) {
        return
      }
    }

    // Console output
    if (this.config.enableConsole) {
      this.consoleOutput(entry)
    }

    // Custom handler
    if (this.config.customHandler) {
      this.config.customHandler(entry)
    }
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    }

    return levels[level] >= levels[this.config.minLevel]
  }

  /**
   * Output to console
   */
  private consoleOutput(entry: LogEntry): void {
    const { level } = entry

    const method = level === "error" ? console.error : level === "warn" ? console.warn : console.log

    if (this.config.enableJson) {
      // Structured JSON output
      method(JSON.stringify(entry, null, 2))
    } else {
      // Human-readable output
      method(this.formatHumanReadable(entry))
    }
  }

  /**
   * Format log entry for human reading
   */
  private formatHumanReadable(entry: LogEntry): string {
    const time = new Date(entry.timestamp).toISOString()
    const level = entry.level.toUpperCase().padEnd(5)

    switch (entry.event) {
      case "model_selected": {
        const e = entry as SelectionLog
        return [
          `[${time}] ${level} Model Selected: ${e.modelId}`,
          `  Reason: ${e.reason.primary}`,
          `  Factors: ${e.reason.factors.join(", ")}`,
          `  Duration: ${e.durationMs}ms`,
          e.reason.alternatives.length > 0 ? `  Alternatives: ${e.reason.alternatives.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      }

      case "cost_calculated": {
        const e = entry as CostLog
        return [
          `[${time}] ${level} Cost Calculated: ${e.modelId}`,
          `  Input: ${e.inputTokens} tokens ($${e.inputCost.toFixed(6)})`,
          `  Output: ${e.outputTokens} tokens ($${e.outputCost.toFixed(6)})`,
          e.cachedTokens ? `  Cached: ${e.cachedTokens} tokens ($${e.cachedCost!.toFixed(6)})` : "",
          `  Total: $${e.totalCost.toFixed(6)}`,
        ]
          .filter(Boolean)
          .join("\n")
      }

      case "model_error":
      case "selection_error": {
        const e = entry as ErrorLog
        return [
          `[${time}] ${level} Error: ${e.event}`,
          `  Message: ${e.error}`,
          e.modelId ? `  Model: ${e.modelId}` : "",
          e.stack ? `  Stack: ${e.stack.split("\n")[0]}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      }

      case "fallback_triggered": {
        const e = entry as FallbackLog
        return [
          `[${time}] ${level} Fallback Triggered`,
          `  From: ${e.primaryModelId}`,
          `  To: ${e.fallbackModelId}`,
          `  Reason: ${e.reason}`,
        ].join("\n")
      }

      case "performance": {
        const e = entry as PerformanceLog
        return `[${time}] ${level} Performance: ${e.operation} (${e.durationMs}ms) ${e.success ? "✓" : "✗"}`
      }

      default:
        return `[${time}] ${level} ${JSON.stringify(entry)}`
    }
  }
}

/**
 * Singleton logger instance
 */
let loggerInstance: ModelLogger | null = null

/**
 * Get or create singleton logger
 */
export function getLogger(config?: Partial<LoggerConfig>): ModelLogger {
  if (!loggerInstance) {
    loggerInstance = new ModelLogger(config)
  } else if (config) {
    loggerInstance.configure(config)
  }

  return loggerInstance
}

/**
 * Reset logger (for testing)
 */
export function resetLogger(): void {
  loggerInstance = null
}

/**
 * Convenience function: wrap operation with performance logging
 */
export async function withPerformanceLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: { modelId?: string; provider?: string },
): Promise<T> {
  const logger = getLogger()
  const start = Date.now()
  let success = false

  try {
    const result = await fn()
    success = true
    return result
  } finally {
    const durationMs = Date.now() - start
    logger.logPerformance({
      operation,
      durationMs,
      success,
      ...context,
    })
  }
}
