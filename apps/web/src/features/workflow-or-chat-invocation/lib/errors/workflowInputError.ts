/**
 * Shared error types for workflow invocation
 */

/**
 * Thrown when workflow input validation fails
 */
export class InvalidWorkflowInputError extends Error {
  constructor(
    public readonly code: number,
    public readonly message: string,
  ) {
    super(message)
    this.name = "InvalidWorkflowInputError"
  }
}

/**
 * Thrown when required API keys are missing
 */
export class MissingApiKeysError extends Error {
  constructor(
    public readonly missingKeys: string[],
    public readonly missingProviders: string[],
  ) {
    super(`Missing required API keys: ${missingProviders.join(", ")}`)
    this.name = "MissingApiKeysError"
  }
}

/**
 * Thrown when no enabled models are found for a provider
 */
export class NoEnabledModelsError extends Error {
  constructor(public readonly provider: string) {
    super(`No enabled models found for provider: ${provider}`)
    this.name = "NoEnabledModelsError"
  }
}
