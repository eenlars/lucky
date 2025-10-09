/**
 * API and messaging error types.
 */

import { EnhancedError } from "./enhanced-error"

/**
 * Thrown when message validation fails.
 */
export class MessageValidationError extends EnhancedError {
  constructor(
    message: string,
    context?: {
      missingFields?: string[]
      providedData?: Record<string, unknown>
    },
  ) {
    super({
      title: "Invalid Message",
      message,
      action: "Ensure all required message fields are provided with the correct types.",
      debug: {
        code: "MESSAGE_VALIDATION_ERROR",
        context: context || {},
        timestamp: new Date().toISOString(),
      },
      retryable: true,
      retryStrategy: "manual",
    })
    this.name = "MessageValidationError"
  }
}

/**
 * Thrown when API response format is unexpected or invalid.
 */
export class ResponseFormatError extends EnhancedError {
  constructor(
    message: string,
    context?: {
      responseType?: string
      expectedType?: string
      details?: Record<string, unknown>
    },
  ) {
    super({
      title: "Unexpected Response Format",
      message,
      action: "Check the API response format and update the integration if the API has changed.",
      debug: {
        code: "RESPONSE_FORMAT_ERROR",
        context: context || {},
        timestamp: new Date().toISOString(),
      },
      retryable: false,
    })
    this.name = "ResponseFormatError"
  }
}

/**
 * Thrown when coordination/handoff configuration is invalid.
 */
export class CoordinationError extends EnhancedError {
  constructor(
    message: string,
    context?: {
      coordinationType?: string
      supportedTypes?: string[]
    },
  ) {
    super({
      title: "Coordination Error",
      message,
      action: context?.supportedTypes
        ? `Use one of the supported coordination types: ${context.supportedTypes.join(", ")}`
        : "Check the coordination configuration and ensure it's properly set up.",
      debug: {
        code: "COORDINATION_ERROR",
        context: context || {},
        timestamp: new Date().toISOString(),
      },
      docsUrl: "/docs/workflow/coordination",
      retryable: true,
      retryStrategy: "manual",
    })
    this.name = "CoordinationError"
  }
}
