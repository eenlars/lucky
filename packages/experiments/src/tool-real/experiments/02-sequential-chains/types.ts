/**
 * Type definitions for sequential tool execution experiments
 */

import type { CoreMessage } from "ai"

export interface ToolExecution {
  toolName: string
  timestamp: number
  inputData: Record<string, unknown>
  outputData: unknown
  executionIndex: number
}

export interface SequentialRunResult {
  messages: CoreMessage[]
  toolExecutions: ToolExecution[]
  finalResponse: string
  success: boolean
  /** Total end-to-end duration for the model session (ms) */
  totalDurationMs?: number
  /** Total USD cost for the model session (aggregated across steps) */
  totalCostUsd?: number
}

export interface ValidationResult {
  score: number
  orderCorrect: boolean
  dataFlowCorrect: boolean
  allToolsUsed: boolean
  finalAnswerCorrect: boolean
  executionPattern: "sequential" | "parallel" | "random"
  details: string
}

export interface ExperimentResult {
  model: string
  chain: string
  promptId: string
  validation: ValidationResult
}

export interface ModelPerformance {
  model: string
  avgScore: number
  perfectCount: number
  totalTests: number
}

export interface ChainComplexity {
  chain: string
  avgScore: number
  perfectCount: number
  totalTests: number
}

export interface ExperimentAnalysis {
  modelPerformance: ModelPerformance[]
  chainComplexity: ChainComplexity[]
  overallStats: {
    totalTests: number
    avgScore: number
    perfectExecutions: number
  }
}

export type ToolImplementation = (args: Record<string, unknown>) => unknown
export type ToolImplementations = Record<string, ToolImplementation>
