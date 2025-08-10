/**
 * Shared constants across experiments
 */

export const EXPERIMENT_CONFIG = {
  maxRetries: 3,
  timeout: 30000,
  temperature: 0,
} as const

export const OUTPUT_FORMATS = {
  json: ".json",
  csv: ".csv",
  log: ".log",
} as const
