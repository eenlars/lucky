import { getSettings } from "@utils/config/runtimeConfig"

export interface ValidationConfig {
  enabled: boolean
  thresholds: {
    proceedMinScore: number
    retryMinScore: number
    escalateMaxScore: number
  }
  actions: {
    onRetry: "block" | "warn" | "log"
    onEscalate: "block" | "warn" | "log"
    maxRetries: number
  }
}

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  enabled: getSettings().verification.enableOutputValidation,
  thresholds: {
    proceedMinScore: 7,
    retryMinScore: 4,
    escalateMaxScore: 3,
  },
  actions: {
    onRetry: "warn",
    onEscalate: "block",
    maxRetries: 1,
  },
}
