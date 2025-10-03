/**
 * Domain-specific errors for persistence operations.
 * Translate database errors into clear domain errors.
 */

export class PersistenceError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message)
    this.name = "PersistenceError"
  }
}

export class WorkflowNotFoundError extends PersistenceError {
  constructor(workflowVersionId: string, cause?: Error) {
    super(`Workflow version not found: ${workflowVersionId}`, cause)
    this.name = "WorkflowNotFoundError"
  }
}

export class NodeVersionMissingError extends PersistenceError {
  constructor(nodeId: string, workflowVersionId: string, cause?: Error) {
    super(`NodeVersion doesn't exist for node_id=${nodeId}, wf_version_id=${workflowVersionId}`, cause)
    this.name = "NodeVersionMissingError"
  }
}

export class DatasetRecordNotFoundError extends PersistenceError {
  constructor(recordIds: string[], cause?: Error) {
    super(`No dataset records found for IDs: ${recordIds.join(", ")}`, cause)
    this.name = "DatasetRecordNotFoundError"
  }
}

export class InvalidInputError extends PersistenceError {
  constructor(message: string) {
    super(message)
    this.name = "InvalidInputError"
  }
}
