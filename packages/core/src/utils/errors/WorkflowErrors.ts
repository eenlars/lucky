/**
 * Domain-specific error classes for the workflow system.
 * Provides structured error handling with error codes and context.
 */

export interface ErrorContext {
  [key: string]: unknown
}

/**
 * Base class for all workflow-related errors.
 * Extends Error with error codes and structured context.
 */
export class WorkflowError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: ErrorContext,
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
    }
  }
}

/**
 * Thrown when workflow validation fails.
 */
export class WorkflowValidationError extends WorkflowError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "WORKFLOW_VALIDATION_ERROR", context)
  }
}

/**
 * Thrown when workflow execution fails.
 */
export class WorkflowExecutionError extends WorkflowError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "WORKFLOW_EXECUTION_ERROR", context)
  }
}

/**
 * Thrown when workflow persistence operations fail.
 */
export class WorkflowPersistenceError extends WorkflowError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "WORKFLOW_PERSISTENCE_ERROR", context)
  }
}

/**
 * Thrown when workflow configuration is invalid.
 */
export class WorkflowConfigurationError extends WorkflowError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "WORKFLOW_CONFIGURATION_ERROR", context)
  }
}

/**
 * Thrown when node operations fail.
 */
export class NodeExecutionError extends WorkflowError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "NODE_EXECUTION_ERROR", context)
  }
}

/**
 * Thrown when node invocation fails.
 */
export class NodeInvocationError extends WorkflowError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "NODE_INVOCATION_ERROR", context)
  }
}

/**
 * Thrown when memory operations fail.
 */
export class MemoryOperationError extends WorkflowError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "MEMORY_OPERATION_ERROR", context)
  }
}

/**
 * Thrown when evaluation operations fail.
 */
export class EvaluationError extends WorkflowError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "EVALUATION_ERROR", context)
  }
}

/**
 * Thrown when evolution operations fail.
 */
export class EvolutionError extends WorkflowError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "EVOLUTION_ERROR", context)
  }
}

/**
 * Thrown when genome operations fail.
 */
export class GenomeError extends WorkflowError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "GENOME_ERROR", context)
  }
}

/**
 * Thrown when tool operations fail.
 */
export class ToolExecutionError extends WorkflowError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "TOOL_EXECUTION_ERROR", context)
  }
}

/**
 * Thrown when message operations fail.
 */
export class MessageError extends WorkflowError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "MESSAGE_ERROR", context)
  }
}

/**
 * Thrown when state management operations fail.
 */
export class StateManagementError extends WorkflowError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "STATE_MANAGEMENT_ERROR", context)
  }
}

/**
 * Thrown when race conditions are detected.
 */
export class RaceConditionError extends WorkflowError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "RACE_CONDITION_ERROR", context)
  }
}
