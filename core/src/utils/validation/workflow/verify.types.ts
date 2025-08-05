// validation result type
export interface VerificationResult {
  isValid: boolean
  errors: string[]
}

export type VerificationErrors = string[]

// validation options interface
export interface ValidationOptions {
  throwOnError: boolean
  verbose?: boolean
}
