/**
 * Data loading and ingestion error types.
 */

import { EnhancedError } from "./enhanced-error"

/**
 * Thrown when data loading/fetching fails.
 */
export class DataLoadingError extends EnhancedError {
  constructor(
    dataType: string,
    message: string,
    context?: {
      source?: string
      taskId?: string
      httpStatus?: number
      details?: Record<string, unknown>
    },
  ) {
    super({
      title: `Failed to Load ${dataType}`,
      message,
      action: "Check the data source and network connection. Verify the data format and try again.",
      debug: {
        code: "DATA_LOADING_ERROR",
        context: { dataType, ...context },
        timestamp: new Date().toISOString(),
      },
      retryable: true,
      retryStrategy: "exponential",
    })
    this.name = "DataLoadingError"
  }
}

/**
 * Thrown when data is not found.
 */
export class DataNotFoundError extends EnhancedError {
  constructor(
    dataType: string,
    identifier: string,
    context?: {
      searchedIn?: string
      availableIds?: string[]
      suggestion?: string
    },
  ) {
    super({
      title: `${dataType} Not Found`,
      message: `Could not find ${dataType} with identifier: ${identifier}`,
      action: context?.suggestion ? context.suggestion : `Verify the identifier is correct and the ${dataType} exists.`,
      debug: {
        code: "DATA_NOT_FOUND",
        context: { dataType, identifier, ...context },
        timestamp: new Date().toISOString(),
      },
      retryable: false,
    })
    this.name = "DataNotFoundError"
  }
}

/**
 * Thrown when evaluation/ingestion configuration is invalid.
 */
export class IngestionError extends EnhancedError {
  constructor(
    message: string,
    context?: {
      evaluationType?: string
      providedFormat?: string
      expectedFormat?: string
      details?: Record<string, unknown>
    },
  ) {
    super({
      title: "Data Ingestion Error",
      message,
      action: context?.expectedFormat
        ? `Use the correct format: ${context.expectedFormat}`
        : "Check the evaluation configuration and data format.",
      debug: {
        code: "INGESTION_ERROR",
        context: context || {},
        timestamp: new Date().toISOString(),
      },
      docsUrl: "/docs/evaluation/ingestion",
      retryable: true,
      retryStrategy: "manual",
    })
    this.name = "IngestionError"
  }
}

/**
 * Thrown when required environment configuration is missing.
 */
export class MissingConfigError extends EnhancedError {
  constructor(
    configName: string,
    context?: {
      requiredFor?: string
      suggestion?: string
    },
  ) {
    super({
      title: "Missing Configuration",
      message: `Required configuration '${configName}' is not set.`,
      action: context?.suggestion
        ? context.suggestion
        : `Set ${configName} in your environment variables or configuration file.`,
      debug: {
        code: "MISSING_CONFIG",
        context: { configName, ...context },
        timestamp: new Date().toISOString(),
      },
      docsUrl: "/docs/configuration",
      retryable: true,
      retryStrategy: "manual",
    })
    this.name = "MissingConfigError"
  }
}
