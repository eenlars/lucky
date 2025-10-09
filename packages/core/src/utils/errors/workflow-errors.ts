/**
 * Workflow-specific error types for better error handling and user experience.
 */

import { EnhancedError } from "./enhanced-error"

/**
 * Thrown when workflow execution fails due to runtime issues.
 */
export class WorkflowExecutionError extends EnhancedError {
  constructor(
    message: string,
    context?: {
      workflowId?: string
      step?: string
      details?: Record<string, unknown>
    },
  ) {
    super({
      title: "Workflow Execution Failed",
      message,
      action: "Check the workflow logs and verify all required data is available. Try running the workflow again.",
      debug: {
        code: "WORKFLOW_EXECUTION_ERROR",
        context: context || {},
        timestamp: new Date().toISOString(),
      },
      retryable: true,
      retryStrategy: "manual",
    })
    this.name = "WorkflowExecutionError"
  }
}

/**
 * Thrown when workflow configuration is invalid or missing required fields.
 */
export class WorkflowConfigurationError extends EnhancedError {
  constructor(
    message: string,
    context?: {
      field?: string
      providedValue?: unknown
      expectedFormat?: string
    },
  ) {
    super({
      title: "Invalid Workflow Configuration",
      message,
      action:
        "Update the workflow configuration with the required fields. Check the documentation for the expected format.",
      debug: {
        code: "WORKFLOW_CONFIG_ERROR",
        context: context || {},
        timestamp: new Date().toISOString(),
      },
      docsUrl: "/docs/workflow/configuration",
      retryable: true,
      retryStrategy: "manual",
    })
    this.name = "WorkflowConfigurationError"
  }
}

/**
 * Thrown when workflow fitness/evaluation data is not available.
 */
export class WorkflowFitnessError extends EnhancedError {
  constructor(
    message: string,
    context?: {
      workflowId?: string
      workflowVersionId?: string
    },
  ) {
    super({
      title: "Fitness Data Not Available",
      message,
      action: "Ensure the workflow has been evaluated before accessing fitness data. Run workflow evaluation first.",
      debug: {
        code: "WORKFLOW_FITNESS_ERROR",
        context: context || {},
        timestamp: new Date().toISOString(),
      },
      retryable: true,
      retryStrategy: "manual",
    })
    this.name = "WorkflowFitnessError"
  }
}

/**
 * Thrown when workflow repair/validation fails.
 */
export class WorkflowRepairError extends EnhancedError {
  constructor(
    message: string,
    context?: {
      attempts?: number
      maxRetries?: number
      errors?: unknown[]
    },
  ) {
    super({
      title: "Workflow Repair Failed",
      message,
      action:
        "Review the validation errors and manually fix the workflow configuration. Ensure all nodes have valid settings.",
      debug: {
        code: "WORKFLOW_REPAIR_ERROR",
        context: context || {},
        timestamp: new Date().toISOString(),
      },
      docsUrl: "/docs/workflow/validation",
      retryable: false,
    })
    this.name = "WorkflowRepairError"
  }
}

/**
 * Thrown when browser environment attempts operations that require Node.js/filesystem.
 */
export class BrowserEnvironmentError extends EnhancedError {
  constructor(
    operation: string,
    context?: {
      suggestedAlternative?: string
    },
  ) {
    super({
      title: "Operation Not Available in Browser",
      message: `Cannot perform '${operation}' in browser environment. This operation requires filesystem access.`,
      action: context?.suggestedAlternative
        ? `Use ${context.suggestedAlternative} instead.`
        : "Use API routes or run this operation on the server side.",
      debug: {
        code: "BROWSER_ENVIRONMENT_ERROR",
        context: { operation, ...context },
        timestamp: new Date().toISOString(),
      },
      retryable: false,
    })
    this.name = "BrowserEnvironmentError"
  }
}
