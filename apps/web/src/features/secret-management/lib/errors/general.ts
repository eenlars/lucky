/**
 * Thrown when required API keys are missing
 */
export class MissingApiKeysError extends Error {
  constructor(
    public readonly missingKeys: string[],
    public readonly missingProviders: string[],
  ) {
    super(`Missing required API keys: ${missingKeys.join(", ")}`)
    this.name = "MissingApiKeysError"
  }
}
