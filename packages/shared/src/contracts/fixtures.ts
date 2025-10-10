/**
 * Test fixtures for configuration contracts.
 * Provides reusable, validated config objects for testing.
 *
 * USAGE: Import these instead of creating inline config in tests.
 */

import { DEFAULT_RUNTIME_CONFIG, type PartialRuntimeConfig, type RuntimeConfig, mergeRuntimeConfig } from "./config"
import { DEFAULT_EVOLUTION_SETTINGS, type EvolutionSettings } from "./evolution"
import type { EvaluationInput } from "./ingestion"

// ============================================================================
// RUNTIME CONFIG FIXTURES
// ============================================================================

/**
 * Standard test config (verbose: false)
 */
export function createTestConfig(overrides?: PartialRuntimeConfig): RuntimeConfig {
  return mergeRuntimeConfig({
    ...overrides,
    evolution: {
      ...DEFAULT_RUNTIME_CONFIG.evolution,
      GP: {
        ...DEFAULT_RUNTIME_CONFIG.evolution.GP,
        verbose: false,
      },
      ...overrides?.evolution,
    },
  })
}

/**
 * Verbose test config (verbose: true, useful for debugging)
 */
export function createVerboseTestConfig(overrides?: PartialRuntimeConfig): RuntimeConfig {
  return mergeRuntimeConfig({
    ...overrides,
    evolution: {
      ...DEFAULT_RUNTIME_CONFIG.evolution,
      GP: {
        ...DEFAULT_RUNTIME_CONFIG.evolution.GP,
        verbose: true,
      },
      ...overrides?.evolution,
    },
  })
}

/**
 * Minimal test config (for fast tests)
 */
export function createMinimalTestConfig(): RuntimeConfig {
  return mergeRuntimeConfig({
    tools: {
      ...DEFAULT_RUNTIME_CONFIG.tools,
      maxStepsVercel: 1,
      experimentalMultiStepLoopMaxRounds: 1,
    },
    workflow: {
      ...DEFAULT_RUNTIME_CONFIG.workflow,
      maxTotalNodeInvocations: 1,
      maxPerNodeInvocations: 1,
    },
    evolution: {
      ...DEFAULT_RUNTIME_CONFIG.evolution,
      GP: {
        ...DEFAULT_RUNTIME_CONFIG.evolution.GP,
        generations: 1,
        populationSize: 1,
        verbose: false,
      },
    },
  })
}

// ============================================================================
// EVOLUTION CONFIG FIXTURES
// ============================================================================

/**
 * Standard evolution settings for tests
 */
export function createTestEvolutionSettings(overrides?: Partial<EvolutionSettings>): EvolutionSettings {
  return {
    ...DEFAULT_EVOLUTION_SETTINGS,
    populationSize: 5,
    generations: 3,
    maxCostUSD: 1.0,
    ...overrides,
  }
}

// ============================================================================
// EVALUATION INPUT FIXTURES
// ============================================================================

/**
 * Simple text evaluation input
 */
export function createTextEvaluation(overrides?: Partial<EvaluationInput>): EvaluationInput {
  return {
    type: "text",
    goal: "test goal",
    workflowId: "test-workflow-id",
    question: "test question",
    answer: "test answer",
    ...overrides,
  } as EvaluationInput
}

/**
 * Prompt-only evaluation (no ground truth)
 */
export function createPromptOnlyEvaluation(goal: string, workflowId: string): EvaluationInput {
  return {
    type: "prompt-only",
    goal,
    workflowId,
  }
}

/**
 * CSV evaluation input
 */
export function createCSVEvaluation(overrides?: Partial<EvaluationInput>): EvaluationInput {
  return {
    type: "csv",
    goal: "test goal",
    workflowId: "test-workflow-id",
    evaluation: "column:expected",
    ...overrides,
  } as EvaluationInput
}

// ============================================================================
// COMMON TEST CONSTANTS
// ============================================================================

/**
 * Reusable test IDs and values
 */
export const TEST_IDS = {
  WORKFLOW_ID: "test-workflow-id",
  WORKFLOW_VERSION_ID: "test-version-id",
  WORKFLOW_INVOCATION_ID: "test-invocation-id",
  NODE_ID: "test-node-id",
  NODE_INVOCATION_ID: "test-node-invocation-id",
  RUN_ID: "test-run-id",
  GENERATION_ID: "test-generation-id",
  GENOME_ID: "test-genome-id",
} as const

export const TEST_VALUES = {
  COST_USD: 0.01,
  TIME_SECONDS: 10,
  FITNESS_SCORE: 0.8,
  ACCURACY_SCORE: 0.8,
  SYSTEM_PROMPT: "test system prompt",
  DESCRIPTION: "test description",
  GOAL: "test goal",
  QUESTION: "test question",
  ANSWER: "test answer",
  ERROR_MESSAGE: "test error message",
} as const
