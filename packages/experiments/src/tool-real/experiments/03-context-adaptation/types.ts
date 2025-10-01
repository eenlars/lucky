import type { OpenRouterModelName } from "@lucky/core/utils/spending/models.types"
import type { ToolExecution } from "../02-sequential-chains/types"

export type Condition = "vague" | "clear"

export type LoopStrategy = "single-call" | "optimal-split" | "multi-call" | "no-success"

export interface LoopCountsUsed {
  "1": number
  "2": number
  "3": number
  gt3: number
}

export interface LoopMetrics {
  fetchCallsCount: number
  combineCallsCount: number
  firstCallFailed: boolean
  countsUsed: LoopCountsUsed
  adherenceToLimit: number
  totalItemsFetched: number
  requested: number
  adapted: boolean
  errorRate: number
  strategy: LoopStrategy
}

export interface OurAlgorithmLoop {
  loop: number
  success: boolean
  cost?: number
  durationMs?: number
  updatedMemory?: Record<string, string> | null
  learnings?: string | null
  toolExecutions: ToolExecution[]
  metrics: LoopMetrics
}

export interface LearningEffects {
  deltaAdapted: number
  deltaFetchCalls: number
  deltaErrorRate: number
  deltaAdherence: number
  optimalSplitAdopted: boolean
  memoryGrowth: number
}

export interface OurAlgorithmRun {
  model: OpenRouterModelName
  scenario: string
  condition: Condition
  adapted: boolean
  totalFetchCalls: number
  successItems: number
  success: boolean
  cost: number
  durationMs: number
  loops: OurAlgorithmLoop[]
  learningEffects: LearningEffects | null
}

export interface OurAlgorithmExperimentResults {
  timestamp: string
  runs: OurAlgorithmRun[]
}
