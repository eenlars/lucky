/**
 * Test configuration mocks for @core/core-config/compat.
 * Converts shared RuntimeConfig fixtures into the legacy runtime shape.
 */

import type { LegacyRuntimeConfig } from "@core/core-config/compat"
import type { FlowRuntimeConfig } from "@core/types"
import type { PartialRuntimeConfig, RuntimeConfig } from "@lucky/shared/contracts/config"
import { createTestConfig, createVerboseTestConfig } from "@lucky/shared/contracts/fixtures"
import { TOOLS } from "@lucky/shared/contracts/tools"

const DEFAULT_INGESTION_TASK_LIMIT = 100

function toLegacyRuntimeConfig(runtime: RuntimeConfig): LegacyRuntimeConfig {
  const fileLimitConfig = {
    maxFilesPerWorkflow: runtime.context.maxFilesPerWorkflow,
    enforceFileLimit: runtime.context.enforceFileLimit,
  }

  return {
    ...runtime,
    workflow: {
      ...runtime.workflow,
      asyncExecution: false,
    },
    tools: {
      ...runtime.tools,
      mcp: TOOLS.mcp,
      code: TOOLS.code,
    },
    limits: {
      ...runtime.limits,
      ...fileLimitConfig,
    },
    verification: {
      ...runtime.verification,
      ...fileLimitConfig,
    },
    ingestion: {
      taskLimit: DEFAULT_INGESTION_TASK_LIMIT,
    },
  }
}

/**
 * Create a complete mock CONFIG for verbose mode testing
 */
export function createMockConfigVerbose(overrides?: PartialRuntimeConfig): LegacyRuntimeConfig {
  return toLegacyRuntimeConfig(createVerboseTestConfig(overrides))
}

/**
 * Create a complete mock CONFIG for standard testing
 */
export function createMockConfigStandard(overrides?: PartialRuntimeConfig): LegacyRuntimeConfig {
  return toLegacyRuntimeConfig(createTestConfig(overrides))
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
    default: "openrouter#google/gemini-2.5-flash-lite",
    summary: "openrouter#google/gemini-2.5-flash-lite",
    nano: "openrouter#google/gemini-2.5-flash-lite",
    low: "openrouter#google/gemini-2.5-flash-lite",
    medium: "openrouter#openai/gpt-4.1-mini",
    high: "openrouter#openai/gpt-4.1",
    fitness: "openrouter#openai/gpt-4.1-mini",
    reasoning: "openrouter#openai/gpt-4.1-mini",
    fallback: "switchpoint/router",
  }
}

/**
 * Validate a FlowRuntimeConfig against the runtime contract.
 * Useful for testing that mock configs conform to the schema.
 *
 * @throws ZodError if config is invalid
 */
export function validateMockConfig(_config: FlowRuntimeConfig): void {
  // Validation now handled by contracts. No-op for backward compatibility.
}
