/**
 * Base class for all database-related errors
 */
export abstract class DatabaseError extends Error {
  abstract readonly code: string

  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class UnknownDatabaseError extends DatabaseError {
  readonly code = "UNKNOWN_DATABASE_ERROR"

  constructor(message = "An unknown database error occurred", cause?: Error) {
    super(message, cause)
  }
}

/**
 * Thrown when a database connection cannot be established
 */
export class DatabaseConnectionError extends DatabaseError {
  readonly code = "DB_CONNECTION_ERROR"

  constructor(message = "Failed to connect to database", cause?: Error) {
    super(message, cause)
  }
}

/**
 * Thrown when a database query times out
 */
export class DatabaseTimeoutError extends DatabaseError {
  readonly code = "DB_TIMEOUT_ERROR"

  constructor(message = "Database query timed out", cause?: Error) {
    super(message, cause)
  }
}

/**
 * Thrown when a required record is not found in the database
 */
export class RecordNotFoundError extends DatabaseError {
  readonly code = "RECORD_NOT_FOUND"

  constructor(
    public readonly table: string,
    public readonly identifier: string | Record<string, unknown>,
    cause?: Error,
  ) {
    const id = typeof identifier === "string" ? identifier : JSON.stringify(identifier)
    super(`Record not found in table "${table}" with identifier: ${id}`, cause)
  }
}

/**
 * Thrown when attempting to create a record that already exists
 */
export class RecordAlreadyExistsError extends DatabaseError {
  readonly code = "RECORD_ALREADY_EXISTS"

  constructor(
    public readonly table: string,
    public readonly identifier: string | Record<string, unknown>,
    cause?: Error,
  ) {
    const id = typeof identifier === "string" ? identifier : JSON.stringify(identifier)
    super(`Record already exists in table "${table}" with identifier: ${id}`, cause)
  }
}

/**
 * Thrown when a database constraint is violated (foreign key, unique, etc.)
 */
export class ConstraintViolationError extends DatabaseError {
  readonly code = "CONSTRAINT_VIOLATION"

  constructor(
    public readonly constraint: string,
    message?: string,
    cause?: Error,
  ) {
    super(message || `Database constraint violation: ${constraint}`, cause)
  }
}

/**
 * Thrown when user lacks permission to perform a database operation
 */
export class InsufficientPermissionsError extends DatabaseError {
  readonly code = "INSUFFICIENT_PERMISSIONS"

  constructor(
    public readonly operation: string,
    public readonly resource?: string,
    cause?: Error,
  ) {
    const resourceMsg = resource ? ` on resource "${resource}"` : ""
    super(`Insufficient permissions to perform operation "${operation}"${resourceMsg}`, cause)
  }
}

/**
 * Thrown when RLS (Row Level Security) blocks an operation
 */
export class RowLevelSecurityError extends DatabaseError {
  readonly code = "RLS_VIOLATION"

  constructor(
    public readonly table: string,
    public readonly operation: string,
    cause?: Error,
  ) {
    super(`Row Level Security blocked ${operation} operation on table "${table}"`, cause)
  }
}

/**
 * Thrown when a database transaction fails or is rolled back
 */
export class TransactionError extends DatabaseError {
  readonly code = "TRANSACTION_ERROR"

  constructor(message = "Database transaction failed", cause?: Error) {
    super(message, cause)
  }
}
