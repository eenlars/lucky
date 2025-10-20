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
