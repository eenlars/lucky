// shared test helper functions and utilities
import { vi } from "vitest"

// common tool execution context for tool tests
export const createMockToolExecutionContext = (
  overrides: Partial<{
    workflowInvocationId: string
    workflowFiles: any[]
    expectedOutputType: any
    mainWorkflowGoal: string
    workflowId: string
  }> = {},
) => ({
  workflowInvocationId: overrides.workflowInvocationId || `test-invocation-${Date.now()}`,
  workflowFiles: overrides.workflowFiles || [],
  expectedOutputType: overrides.expectedOutputType || undefined,
  mainWorkflowGoal: overrides.mainWorkflowGoal || "test goal",
  workflowId: overrides.workflowId || `test-workflow-${Date.now()}`,
})

// reset all vitest mocks - call this in beforeEach
export const resetAllTestMocks = () => {
  vi.clearAllMocks()
  vi.resetAllMocks()
}

// common beforeEach setup for vitest tests
export const setupVitest = () => {
  resetAllTestMocks()
}

// helper to create timeout promises for async tests
export const createTimeoutPromise = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// helper to expect async functions to complete within timeout
export const expectWithinTimeout = async (asyncFn: () => Promise<any>, timeoutMs: number = 5000) => {
  const startTime = Date.now()
  const result = await asyncFn()
  const endTime = Date.now()

  if (endTime - startTime > timeoutMs)
    throw new Error(`Operation took ${endTime - startTime}ms, expected < ${timeoutMs}ms`)

  return result
}

// helper to mock resolved values consistently
export const mockResolvedValue = <T>(value: T) => vi.fn().mockResolvedValue(value)

// helper to mock rejected values consistently
export const mockRejectedValue = (error: string | Error) =>
  vi.fn().mockRejectedValue(typeof error === "string" ? new Error(error) : error)

// helper to create consistent mock responses for AI requests
export const createMockAIResponse = (data: any, cost = 0.01) => ({
  success: true,
  data,
  error: null,
  usdCost: cost,
  debug_input: [],
})

// helper to create consistent mock error responses
export const createMockErrorResponse = (error: string) => ({
  success: false,
  data: null,
  error,
  usdCost: 0,
  debug_input: [],
})

// helper to create mock workflow configs
export const createBasicWorkflowConfig = () => ({
  nodes: [
    {
      nodeId: "node1",
      description: "test node",
      systemPrompt: "test system prompt",
      modelName: "openai/gpt-4.1-mini",
      mcpTools: [],
      codeTools: [],
      handOffs: [],
      memory: {},
    },
  ],
  entryNodeId: "node1",
})

// helper to create evaluation inputs
export const createBasicEvaluationInput = (type: "text" | "csv" = "csv") => {
  if (type === "text") {
    return {
      type: "text" as const,
      question: "test question",
      answer: "test answer",
      goal: "test goal",
      workflowId: "test-workflow-id",
    }
  }

  return {
    type: "csv" as const,
    evaluation: "test evaluation criteria",
    goal: "test goal",
    workflowId: "test-workflow-id",
  }
}

// helper to create standard fitness scores
export const createBasicFitnessScore = (score = 0.8) => ({
  score,
  totalCostUsd: 0.01,
  totalTimeSeconds: 10,
  accuracy: score,
  workflowVersionId: "test-genome-id",
  valid: true,
  evaluatedAt: new Date().toISOString(),
})

// helper to create mock evolution contexts
export const createMockEvolutionContext = () => ({
  runId: "test-run-id",
  generationId: "test-generation-id",
})

// helper to create mock evolution configs
export const createMockEvolutionConfig = (overrides = {}) => ({
  populationSize: 5,
  generations: 3,
  maxCostUSD: 1.0,
  dbPath: ":memory:",
  eliteSize: 1,
  tournamentSize: 2,
  crossoverRate: 0.7,
  mutationParams: {
    mutationInstructions: "test mutation instructions",
  },
  maxEvaluationsPerHour: 100,
  mu_parents_to_keep: 5,
  lambda_offspring_to_produce: 5,
  rho_parent_amount: 2,
  evaluationDataset: "test",
  baselineComparison: false,
  ...overrides,
})

// helper to check if test is running in verbose mode
export const isVerboseTestMode = () => {
  return process.env.VITEST_VERBOSE === "true" || process.env.NODE_ENV === "test"
}

// helper to skip slow tests in CI
export const skipIfCI = () => {
  if (process.env.CI) {
    return true
  }
  return false
}

// helper to create predictable test IDs
export const createTestId = (prefix = "test") => `${prefix}-${Math.random().toString(36).substring(2, 9)}`

// helper to create mock database responses
export const createMockDatabaseResponse = (data: any = []) => ({
  data,
  error: null,
})

// helper to create mock database error responses
export const createMockDatabaseError = (message: string) => ({
  data: null,
  error: { message },
})
