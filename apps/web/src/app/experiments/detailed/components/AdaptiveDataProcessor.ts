// Note: JSON import will be handled by dynamic loading
import type { Condition } from "@experiments/tool-real/experiments/03-context-adaptation/types"

export interface AdaptiveBehavior {
  initialFailure: boolean
  retryAttempts: number
  successfulStrategy: boolean
  finalObjectCount: number
  hadCombineCall: boolean
  totalToolCalls: number
}

export interface ToolCall {
  toolName: string
  args: Record<string, any>
  result: any
  success: boolean
  error?: string
}

export interface AdaptiveResult {
  model: string
  scenario: string
  condition: Condition
  toolCalls: ToolCall[]
  finalResponse: string
  success: boolean
  adaptiveBehavior: AdaptiveBehavior
}

export interface ProcessedData {
  results: AdaptiveResult[]
  models: string[]
  scenarios: string[]
  conditions: Condition[]
  successRateMatrix: Array<{
    model: string
    vague: number
    clear: number
    improvement: number
  }>
  behaviorMetrics: Array<{
    model: string
    scenario: string
    condition: Condition
    retryAttempts: number
    toolCalls: number
    success: boolean
    finalCount: number
  }>
  toolSequenceData: Array<{
    model: string
    condition: Condition
    sequence: string[]
    success: boolean
    pattern: "successful_chunking" | "repeated_failures" | "immediate_success"
  }>
}

export function processAdaptiveData(): ProcessedData {
  // Load the actual experiment data
  const data = getAdaptiveData()
  const results = data.results as AdaptiveResult[]

  // Extract unique values
  const models = Array.from(new Set(results.map(r => r.model)))
  const scenarios = Array.from(new Set(results.map(r => r.scenario)))
  const conditions: Condition[] = ["vague", "clear"]

  // Calculate success rate matrix
  const successRateMatrix = models.map(model => {
    const vagueResults = results.filter(r => r.model === model && r.condition === "vague")
    const clearResults = results.filter(r => r.model === model && r.condition === "clear")

    const vagueSuccessRate =
      vagueResults.length > 0
        ? vagueResults.filter(r => r.adaptiveBehavior.successfulStrategy).length / vagueResults.length
        : 0
    const clearSuccessRate =
      clearResults.length > 0
        ? clearResults.filter(r => r.adaptiveBehavior.successfulStrategy).length / clearResults.length
        : 0

    return {
      model,
      vague: vagueSuccessRate * 100,
      clear: clearSuccessRate * 100,
      improvement: (clearSuccessRate - vagueSuccessRate) * 100,
    }
  })

  // Calculate behavior metrics
  const behaviorMetrics = results.map(result => ({
    model: result.model,
    scenario: result.scenario,
    condition: result.condition,
    retryAttempts: result.adaptiveBehavior.retryAttempts,
    toolCalls: result.adaptiveBehavior.totalToolCalls,
    success: result.adaptiveBehavior.successfulStrategy,
    finalCount: result.adaptiveBehavior.finalObjectCount,
  }))

  // Analyze tool sequences
  const toolSequenceData = results.map(result => {
    const sequence = result.toolCalls.map(call =>
      call.success ? `${call.toolName}(${JSON.stringify(call.args)})` : `${call.toolName}_FAIL`,
    )

    let pattern: "successful_chunking" | "repeated_failures" | "immediate_success" = "repeated_failures"

    if (result.adaptiveBehavior.successfulStrategy) {
      if (result.adaptiveBehavior.totalToolCalls === 1) {
        pattern = "immediate_success"
      } else if (result.adaptiveBehavior.hadCombineCall) {
        pattern = "successful_chunking"
      }
    }

    return {
      model: result.model,
      condition: result.condition,
      sequence,
      success: result.adaptiveBehavior.successfulStrategy,
      pattern,
    }
  })

  return {
    results,
    models,
    scenarios,
    conditions,
    successRateMatrix,
    behaviorMetrics,
    toolSequenceData,
  }
}

export const SCENARIO_DESCRIPTIONS = {
  "basic-failure": "Basic (5 items)",
  "larger-request": "Large (8 items)",
  "within-limit": "Small (2 items)",
}

export const MODEL_COLORS = {
  "gpt-3.5-turbo": "#8b5cf6",
  "gpt-4o-mini": "#06b6d4",
  "gpt-4-turbo": "#f59e0b",
  "gpt-4.1": "#10b981",
  "gpt-4.1-nano": "#ef4444",
}

// Load actual experiment data
import { ADAPTIVE_RESULTS } from "@/lib/adaptive-results"

function getAdaptiveData() {
  return ADAPTIVE_RESULTS
}
