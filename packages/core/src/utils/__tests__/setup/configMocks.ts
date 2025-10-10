/**
 * Test configuration mocks for @core/core-config/compat
 * RE-EXPORTS from @lucky/contracts/fixtures for consistency
 */

import type { FlowRuntimeConfig } from "@core/types"
import { createTestConfig, createVerboseTestConfig } from "@lucky/contracts/fixtures"

/**
 * Create a complete mock CONFIG for verbose mode testing
 */
export function createMockConfigVerbose(): any {
  return createVerboseTestConfig() as any
}

/**
 * Create a complete mock CONFIG for standard testing
 */
export function createMockConfigStandard(): any {
  return createTestConfig() as any
}

/**
 * Create mock PATHS for testing
 */
export function createMockPaths() {
  return {
    root: "/test",
    app: "/test/app",
    runtime: "/test/runtime",
    codeTools: "/test/codeTools",
    setupFile: "/test/setup.txt",
    improver: "/test/improver.json",
    node: {
      logging: "/test/logging",
      memory: {
        root: "/test/memory",
        workfiles: "/test/memory/workfiles",
      },
      error: "/test/error",
    },
  }
}

/**
 * Create mock MODELS for testing
 */
export function createMockModels() {
  return {
    default: "google/gemini-2.5-flash-lite",
    summary: "google/gemini-2.5-flash-lite",
    nano: "google/gemini-2.5-flash-lite",
    low: "google/gemini-2.5-flash-lite",
    medium: "openai/gpt-4.1-mini",
    high: "openai/gpt-4.1",
    fitness: "openai/gpt-4.1-mini",
    reasoning: "openai/gpt-4.1-mini",
    fallback: "switchpoint/router",
  }
}

/**
 * Validate a FlowRuntimeConfig against the runtime contract.
 * Useful for testing that mock configs conform to the schema.
 *
 * @throws ZodError if config is invalid
 */
export function validateMockConfig(config: any): void {
  // Validation now handled by contracts
  // No-op for backward compatibility
}
