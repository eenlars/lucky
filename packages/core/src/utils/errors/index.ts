/**
 * Centralized error exports for the conductor codebase.
 * All error types extend EnhancedError for consistent handling.
 */

export { EnhancedError, enhanceError } from "./enhanced-error"
export type {
  EnhancedErrorOptions,
  EnhancedErrorDebug,
  ActionButton,
} from "./enhanced-error"

export { serializeError } from "./serialize-error"

// Workflow errors
export {
  WorkflowExecutionError,
  WorkflowConfigurationError,
  WorkflowFitnessError,
  WorkflowRepairError,
  BrowserEnvironmentError,
} from "./workflow-errors"

// Data errors
export {
  DataLoadingError,
  DataNotFoundError,
  IngestionError,
  MissingConfigError,
} from "./data-errors"

// Evolution errors
export {
  PopulationError,
  RunTrackingError,
  GeneticOperationError,
} from "./evolution-errors"

// API errors
export {
  MessageValidationError,
  ResponseFormatError,
  CoordinationError,
} from "./api-errors"
