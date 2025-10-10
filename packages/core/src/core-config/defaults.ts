/**
 * Default configuration for standalone core module.
 * All paths are relative to process.cwd() by default.
 * SERVER-ONLY - do not import from client code.
 */

import path from "node:path"
import { DEFAULT_RUNTIME_CONFIG } from "@lucky/shared/contracts/config"
import type { CoreConfig, CoreModelsConfig } from "./types"

/**
 * Creates default core configuration with safe server defaults.
 * Uses ./.core-data as the root directory for all file operations.
 * Runtime config values come from @lucky/contracts.
 */
export function createDefaultCoreConfig(): CoreConfig {
  const cwd = process.cwd()
  const coreDataRoot = path.join(cwd, ".core-data")
  const loggingDir = path.join(coreDataRoot, "logs")
  const memoryRoot = path.join(coreDataRoot, "memory")

  /**
   * Find examples directory by walking up from cwd.
   */
  function findExamplesDir(): string {
    const fallbackPath = path.resolve(cwd, "../examples")
    return fallbackPath
  }

  const examplesRoot = findExamplesDir()
  const codeToolsPath = path.join(examplesRoot, "code_tools")

  return {
    // Runtime values from contracts
    coordinationType: DEFAULT_RUNTIME_CONFIG.coordinationType,
    newNodeProbability: DEFAULT_RUNTIME_CONFIG.newNodeProbability,

    // Paths (server-specific)
    paths: {
      root: coreDataRoot,
      app: path.join(coreDataRoot, "app"),
      runtime: examplesRoot,
      codeTools: codeToolsPath,
      setupFile: path.join(coreDataRoot, "setup", "setupfile.json"),
      improver: path.join(coreDataRoot, "setup", "improve.json"),
      node: {
        logging: loggingDir,
        memory: {
          root: memoryRoot,
          workfiles: path.join(memoryRoot, "workfiles"),
        },
        error: path.join(loggingDir, "error"),
      },
    },

    // All runtime config from contracts
    models: DEFAULT_RUNTIME_CONFIG.models as CoreModelsConfig,
    tools: DEFAULT_RUNTIME_CONFIG.tools,
    logging: DEFAULT_RUNTIME_CONFIG.logging,
    workflow: DEFAULT_RUNTIME_CONFIG.workflow,
    evolution: DEFAULT_RUNTIME_CONFIG.evolution,
    improvement: DEFAULT_RUNTIME_CONFIG.improvement,
    limits: {
      ...DEFAULT_RUNTIME_CONFIG.limits,
      maxFilesPerWorkflow: DEFAULT_RUNTIME_CONFIG.context.maxFilesPerWorkflow,
      enforceFileLimit: DEFAULT_RUNTIME_CONFIG.context.enforceFileLimit,
    },
    verification: {
      ...DEFAULT_RUNTIME_CONFIG.verification,
      maxFilesPerWorkflow: DEFAULT_RUNTIME_CONFIG.context.maxFilesPerWorkflow,
      enforceFileLimit: DEFAULT_RUNTIME_CONFIG.context.enforceFileLimit,
    },

    // Persistence with env var override
    persistence: {
      useMockBackend: process.env.USE_MOCK_PERSISTENCE === "true",
      defaultBackend: process.env.USE_MOCK_PERSISTENCE === "true" ? "memory" : "supabase",
    },
  }
}

/**
 * Deep merge two objects, with override taking precedence.
 * Arrays are replaced entirely, not merged.
 */
export function mergeConfig<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result: any = { ...base }

  for (const key in override) {
    const overrideValue = override[key]
    const baseValue = base[key]

    if (overrideValue === undefined) {
      continue
    }

    // Replace arrays entirely (don't merge)
    if (Array.isArray(overrideValue)) {
      result[key] = overrideValue
      continue
    }

    // Deep merge objects (but not arrays or null)
    if (typeof overrideValue === "object" && overrideValue !== null) {
      result[key] = mergeConfig(baseValue || {}, overrideValue as any)
      continue
    }

    // Replace primitives
    result[key] = overrideValue
  }

  return result as T
}
