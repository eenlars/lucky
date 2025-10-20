/**
 * Thrown when no enabled models found for a provider
 */
export class NoEnabledModelsError extends Error {
  constructor(public readonly provider: string) {
    super(`No enabled models found for provider: ${provider}`)
    this.name = "NoEnabledModelsError"
  }
}
