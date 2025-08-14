import type { InvokeWorkflowResult } from "@core/workflow/runner/types"
import type { RubricCriteria, Metrics } from "../types/evaluation"

/**
 * Parse workflow results and extract metrics
 */
export function parseWorkflowResultToMetrics(result: InvokeWorkflowResult): Metrics {
  const { queueRunResult, fitness, usdCost } = result
  
  return {
    score: fitness?.accuracy ?? null,
    time: queueRunResult.totalTime ? `${(queueRunResult.totalTime / 1000).toFixed(1)}s` : null,
    cost: fitness?.totalCostUsd ? `$${fitness.totalCostUsd.toFixed(4)}` : 
          usdCost ? `$${usdCost.toFixed(4)}` : 
          queueRunResult.totalCost ? `$${queueRunResult.totalCost.toFixed(4)}` : null,
    output: queueRunResult.finalWorkflowOutput || null,
  }
}

/**
 * Parse rubric string and workflow output to calculate achieved points
 */
export function calculateRubricScores(
  criteria: RubricCriteria[], 
  workflowOutput: string,
  fitness?: { accuracy?: number }
): RubricCriteria[] {
  // If we have a fitness accuracy score, distribute it proportionally
  if (fitness?.accuracy) {
    const accuracyPercentage = fitness.accuracy / 100
    
    return criteria.map(criterion => ({
      ...criterion,
      achievedPoints: Math.round(criterion.maxPoints * accuracyPercentage)
    }))
  }
  
  // Otherwise, try to parse the output for specific criteria mentions
  const outputLower = workflowOutput.toLowerCase()
  
  return criteria.map(criterion => {
    // Check if the criterion name appears in the output
    const criterionMentioned = criterion.name && outputLower.includes(criterion.name.toLowerCase())
    
    // Simple heuristic: if mentioned, give partial credit
    const achievedPoints = criterionMentioned ? 
      Math.round(criterion.maxPoints * 0.7) : 
      Math.round(criterion.maxPoints * 0.3)
    
    return {
      ...criterion,
      achievedPoints
    }
  })
}

/**
 * Extract error information from failed results
 */
export function extractErrorInfo(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'error' in error) {
    return String(error.error)
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'Unknown error occurred'
}

/**
 * Format workflow feedback for display
 */
export function formatWorkflowFeedback(result: InvokeWorkflowResult): string | null {
  if (result.feedback) {
    return result.feedback
  }
  
  if (result.fitness) {
    return `Accuracy: ${result.fitness.accuracy}%`
  }
  
  return null
}