/**
 * sequentialEvaluation.ts - Validation logic for sequential tool execution
 * Evaluates order, data flow, and completeness of tool chains
 */

import type { ToolExecution, ValidationResult, ExperimentResult, ExperimentAnalysis } from "./types"

export function validateSequentialExecution(
  executions: ToolExecution[],
  expectedChain: string[],
  expectedFinalOutput?: string,
  actualFinalResponse?: string,
): ValidationResult {
  // 1. Basic completeness – all expected tools were called
  const calledTools = executions.map(e => e.toolName)
  const allToolsUsed = expectedChain.every(tool => calledTools.includes(tool))

  // 1a. Strictness – no extra tools and no repeats
  const extraTools = calledTools.filter(t => !expectedChain.includes(t))
  const toolUseCounts = calledTools.reduce(
    (acc, t) => {
      acc[t] = (acc[t] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const repeatedTools = Object.entries(toolUseCounts)
    .filter(([t, c]) => expectedChain.includes(t) && c > 1)
    .map(([t]) => t)
  const noExtraToolsUsed = extraTools.length === 0
  const noRepeatedTools = repeatedTools.length === 0

  if (!allToolsUsed) {
    return {
      score: 0.0,
      orderCorrect: false,
      dataFlowCorrect: false,
      allToolsUsed: false,
      finalAnswerCorrect: false,
      executionPattern: "random",
      details: `Missing tools: ${expectedChain.filter(tool => !calledTools.includes(tool)).join(", ")}`,
    }
  }

  if (!noExtraToolsUsed) {
    return {
      score: 0.3,
      orderCorrect: false,
      dataFlowCorrect: false,
      allToolsUsed: true,
      finalAnswerCorrect: false,
      executionPattern: "random",
      details: `Extra tools used: ${Array.from(new Set(extraTools)).join(", ")}`,
    }
  }

  if (!noRepeatedTools) {
    return {
      score: 0.3,
      orderCorrect: false,
      dataFlowCorrect: false,
      allToolsUsed: true,
      finalAnswerCorrect: false,
      executionPattern: "random",
      details: `Repeated tool calls: ${repeatedTools.join(", ")}`,
    }
  }

  // 2. check order - tools called in expected sequence
  const toolSequence = executions
    .filter(e => expectedChain.includes(e.toolName))
    .sort((a, b) => a.executionIndex - b.executionIndex)
    .map(e => e.toolName)

  const orderCorrect = JSON.stringify(toolSequence) === JSON.stringify(expectedChain)

  if (!orderCorrect) {
    return {
      score: 0.3,
      orderCorrect: false,
      dataFlowCorrect: false,
      allToolsUsed: true,
      finalAnswerCorrect: false,
      executionPattern: "random",
      details: `Wrong order: got [${toolSequence.join(", ")}], expected [${expectedChain.join(", ")}]`,
    }
  }

  // 3. check data flow - output of tool N becomes input of tool N+1
  let dataFlowCorrect = true
  let dataFlowDetails = ""

  for (let i = 0; i < expectedChain.length - 1; i++) {
    const currentTool = executions.find(e => e.toolName === expectedChain[i])
    const nextTool = executions.find(e => e.toolName === expectedChain[i + 1])

    if (!currentTool || !nextTool) continue

    // check if output of current tool appears as input to next tool
    const currentOutput = currentTool.outputData
    const nextInputValues = Object.values(nextTool.inputData)

    // Check if the current output matches any of the next tool's input parameters
    // This handles both single and multi-parameter tools
    const outputMatchesInput = nextInputValues.some(inputValue => {
      // Direct equality check first
      if (inputValue === currentOutput) return true

      // For objects, use deep equality with proper null/undefined handling
      if (typeof inputValue === "object" && typeof currentOutput === "object") {
        if (inputValue === null && currentOutput === null) return true
        if (inputValue === null || currentOutput === null) return false

        try {
          // Sort object keys for consistent comparison
          const sortedInput = JSON.stringify(inputValue, Object.keys(inputValue as Record<string, unknown>).sort())
          const sortedOutput = JSON.stringify(
            currentOutput,
            Object.keys(currentOutput as Record<string, unknown>).sort(),
          )
          return sortedInput === sortedOutput
        } catch {
          return false
        }
      }

      // Fallback to string comparison
      return String(inputValue) === String(currentOutput)
    })

    if (!outputMatchesInput) {
      dataFlowCorrect = false
      dataFlowDetails = `Data flow break: ${expectedChain[i]} output (${JSON.stringify(currentOutput)}) not found in ${expectedChain[i + 1]} inputs (${JSON.stringify(nextTool.inputData)})`
      break
    }
  }

  // 4. check final answer correctness (if provided)
  let finalAnswerCorrect = true
  let finalAnswerDetails = ""

  if (expectedFinalOutput && actualFinalResponse) {
    // extract final result from tool execution (last tool output)
    const lastToolExecution = executions
      .filter(e => expectedChain.includes(e.toolName))
      .sort((a, b) => a.executionIndex - b.executionIndex)
      .pop()

    const actualToolOutput = lastToolExecution?.outputData

    // check if the final tool output matches expected
    finalAnswerCorrect = String(actualToolOutput) === expectedFinalOutput

    if (!finalAnswerCorrect) {
      finalAnswerDetails = `Final answer mismatch: expected "${expectedFinalOutput}", got "${actualToolOutput}"`
    }
  }

  // 5. determine execution pattern based on timestamps
  const timestamps = executions
    .filter(e => expectedChain.includes(e.toolName))
    .sort((a, b) => a.executionIndex - b.executionIndex)
    .map(e => e.timestamp)

  let executionPattern: "sequential" | "parallel" | "random" = "sequential"

  // if timestamps are very close (within 100ms), consider parallel
  for (let i = 1; i < timestamps.length; i++) {
    if (Math.abs(timestamps[i] - timestamps[i - 1]) < 100) {
      executionPattern = "parallel"
      break
    }
  }

  // calculate final score - weighted scoring for different aspects
  let score = 0.0

  if (allToolsUsed && noExtraToolsUsed && noRepeatedTools) {
    // Base score for using exactly the expected tools, each exactly once
    score += 0.4

    if (orderCorrect) {
      // Additional score for correct order
      score += 0.3

      if (dataFlowCorrect) {
        // Additional score for correct data flow
        score += 0.2
      }

      if (finalAnswerCorrect) {
        // Additional score for correct final answer
        score += 0.1
      }
    }
  }

  // Round to avoid floating point precision issues
  score = Math.round(score * 100) / 100

  const details = finalAnswerDetails || (dataFlowCorrect ? "Perfect sequential execution" : dataFlowDetails)

  return {
    score,
    orderCorrect,
    dataFlowCorrect,
    allToolsUsed,
    finalAnswerCorrect,
    executionPattern,
    details,
  }
}

export function analyzeExperimentResults(results: ExperimentResult[]): ExperimentAnalysis {
  const byModel = results.reduce(
    (acc, result) => {
      if (!acc[result.model]) acc[result.model] = []
      acc[result.model].push(result.validation.score)
      return acc
    },
    {} as Record<string, number[]>,
  )

  const byChain = results.reduce(
    (acc, result) => {
      if (!acc[result.chain]) acc[result.chain] = []
      acc[result.chain].push(result.validation.score)
      return acc
    },
    {} as Record<string, number[]>,
  )

  const modelAverages = Object.entries(byModel).map(([model, scores]) => ({
    model,
    avgScore: scores.reduce((sum, s) => sum + s, 0) / scores.length,
    perfectCount: scores.filter(s => s === 1.0).length,
    totalTests: scores.length,
  }))

  const chainAverages = Object.entries(byChain).map(([chain, scores]) => ({
    chain,
    avgScore: scores.reduce((sum, s) => sum + s, 0) / scores.length,
    perfectCount: scores.filter(s => s === 1.0).length,
    totalTests: scores.length,
  }))

  return {
    modelPerformance: modelAverages.sort((a, b) => b.avgScore - a.avgScore),
    chainComplexity: chainAverages.sort((a, b) => b.avgScore - a.avgScore),
    overallStats: {
      totalTests: results.length,
      avgScore: results.reduce((sum, r) => sum + r.validation.score, 0) / results.length,
      perfectExecutions: results.filter(r => r.validation.score === 1.0).length,
    },
  }
}
