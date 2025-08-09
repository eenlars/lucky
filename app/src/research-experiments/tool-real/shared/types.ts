/**
 * Shared type definitions for tool experiments
 */

export interface ExperimentResult {
  model: string
  promptId: string
  success: boolean
  details: string
  timestamp?: string
}

export interface ModelPerformance {
  model: string
  successRate: number
  totalTests: number
  failures: string[]
}

export interface ToolSpec {
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<string, any>
    required: string[]
  }
}

export interface ValidationResult {
  passed: boolean
  checksPassedCount: number
  totalChecks: number
}