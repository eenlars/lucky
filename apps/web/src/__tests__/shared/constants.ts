/**
 * Shared mock constants and default values for tests
 * RE-EXPORTS from @lucky/contracts/fixtures
 */

import { TEST_IDS, TEST_VALUES } from "@lucky/contracts/fixtures"

// Re-export from contracts
export const TEST_CONSTANTS = {
  // Common test IDs (from contracts)
  ...TEST_IDS,

  // Common test values (from contracts)
  ...TEST_VALUES,

  // Common test arrays
  EMPTY_ARRAY: [],
  EMPTY_OBJECT: {},

  // Common test paths
  PATHS: {
    ROOT: "/test",
    APP: "/test/app",
    RUNTIME: "src/runtime",
    MEMORY: "src/examples/logging_folder/memory",
    LOGGING: "src/examples/logging_folder",
  },

  // Common test timeouts
  TIMEOUTS: {
    FAST: 1000,
    NORMAL: 5000,
    SLOW: 10000,
  },

  // Common test configs
  EVOLUTION_CONFIG: {
    POPULATION_SIZE: 5,
    GENERATIONS: 3,
    TOURNAMENT_SIZE: 3,
    ELITE_SIZE: 1,
  },

  // Common test models
  MODELS: {
    DEFAULT: "google/gemini-2.5-flash-lite",
    HIGH: "openai/gpt-4.1",
    MEDIUM: "openai/gpt-4.1-mini",
    LOW: "google/gemini-2.5-flash-lite",
  },
}

// Legacy exports for backward compatibility
export const WORKFLOW_ID = TEST_CONSTANTS.WORKFLOW_ID
export const RUN_ID = TEST_CONSTANTS.RUN_ID
export const GENERATION_ID = TEST_CONSTANTS.GENERATION_ID
export const GENOME_ID = TEST_CONSTANTS.GENOME_ID
export const NODE_ID = TEST_CONSTANTS.NODE_ID
