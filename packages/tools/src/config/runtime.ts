/**
 * Runtime Configuration for @lucky/tools
 *
 * Provides default paths and settings that tools need at runtime.
 * These can be overridden by the consuming application.
 */

import path from "node:path"
import { fileURLToPath } from "node:url"

// Default paths based on typical project structure
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DEFAULT_ROOT = path.resolve(__dirname, "..", "..", "..", "..")

/**
 * Runtime paths configuration
 */
export interface ToolRuntimePaths {
  root: string
  runtime: string
  node: {
    logging: string
    memory: {
      root: string
      workfiles: string
    }
    error: string
  }
}

/**
 * Runtime models configuration
 */
export interface ToolRuntimeModels {
  fitness: string
}

/**
 * Runtime config for tool execution
 */
export interface ToolRuntimeConfig {
  PATHS: ToolRuntimePaths
  MODELS: ToolRuntimeModels
  CONFIG: {
    logging: {
      override: Record<string, any>
    }
  }
}

// Default configuration
let runtimeConfig: ToolRuntimeConfig = {
  PATHS: {
    root: DEFAULT_ROOT,
    runtime: path.join(DEFAULT_ROOT, "examples"),
    node: {
      logging: path.join(DEFAULT_ROOT, "examples", "logging_folder"),
      memory: {
        root: path.join(DEFAULT_ROOT, "examples", "logging_folder", "memory"),
        workfiles: path.join(DEFAULT_ROOT, "examples", "logging_folder", "memory", "workfiles"),
      },
      error: path.join(DEFAULT_ROOT, "examples", "logging_folder", "error"),
    },
  },
  MODELS: {
    fitness: "gpt-4o-mini",
  },
  CONFIG: {
    logging: {
      override: {
        Tools: "info",
      },
    },
  },
}

/**
 * Get current runtime configuration
 */
export function getToolRuntimeConfig(): ToolRuntimeConfig {
  return runtimeConfig
}

/**
 * Set runtime configuration (call this at application startup)
 */
export function setToolRuntimeConfig(config: Partial<ToolRuntimeConfig>): void {
  runtimeConfig = {
    ...runtimeConfig,
    ...config,
    PATHS: {
      ...runtimeConfig.PATHS,
      ...(config.PATHS || {}),
      node: {
        ...runtimeConfig.PATHS.node,
        ...(config.PATHS?.node || {}),
        memory: {
          ...runtimeConfig.PATHS.node.memory,
          ...(config.PATHS?.node?.memory || {}),
        },
      },
    },
    MODELS: {
      ...runtimeConfig.MODELS,
      ...(config.MODELS || {}),
    },
    CONFIG: {
      ...runtimeConfig.CONFIG,
      ...(config.CONFIG || {}),
      logging: {
        ...runtimeConfig.CONFIG.logging,
        ...(config.CONFIG?.logging || {}),
        override: {
          ...runtimeConfig.CONFIG.logging.override,
          ...(config.CONFIG?.logging?.override || {}),
        },
      },
    },
  }
}

// Export convenient accessors that match the original API
export const PATHS = new Proxy({} as ToolRuntimePaths, {
  get: (_, prop) => getToolRuntimeConfig().PATHS[prop as keyof ToolRuntimePaths],
})

export const MODELS = new Proxy({} as ToolRuntimeModels, {
  get: (_, prop) => getToolRuntimeConfig().MODELS[prop as keyof ToolRuntimeModels],
})

export const CONFIG = new Proxy({} as ToolRuntimeConfig["CONFIG"], {
  get: (_, prop) => getToolRuntimeConfig().CONFIG[prop as keyof ToolRuntimeConfig["CONFIG"]],
})
