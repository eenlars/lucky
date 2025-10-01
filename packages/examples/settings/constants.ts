/**
 * Server-side constants with full path configuration.
 * This file should only be imported in server-side code.
 * For client-side code, use constants.client.ts
 */

import type { FlowPathsConfig, FlowRuntimeConfig } from "@core/types"
import path from "path"
import { fileURLToPath } from "url"

// Import client-safe constants
import { CONFIG as CLIENT_CONFIG, MODELS, getDefaultModels } from "./constants.client"

// Re-export MODELS for server usage
export { MODELS, getDefaultModels }

/* ---------- PATHS ---------- */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, "..", "..") // repo root
// Use absolute paths rooted at the repo to avoid CWD-dependent resolution
const EXAMPLES = path.join(ROOT, "examples")
const LOGGING_FOLDER = path.join(EXAMPLES, "logging_folder")
const MEMORY_ROOT = path.join(LOGGING_FOLDER, "memory")

export const PATHS = {
  root: ROOT,
  app: path.join(ROOT, "app"),
  /**
   * Points to examples/ folder (renamed from examples/).
   * Name preserved for compatibility with AutoDiscovery, MCP config, and WorkflowLoader.
   */
  runtime: EXAMPLES,
  codeTools: path.join(EXAMPLES, "code_tools"),
  setupFile: path.join(EXAMPLES, "setup", "setupfile.json"),
  improver: path.join(EXAMPLES, "setup", "improve.json"),
  node: {
    logging: LOGGING_FOLDER, // this
    memory: {
      root: MEMORY_ROOT,
      workfiles: path.join(MEMORY_ROOT, "workfiles"),
    },
    error: path.join(LOGGING_FOLDER, "error"),
  },
} as const satisfies FlowPathsConfig

/* ---------- CONFIG ---------- */
// Extend client config with server-specific paths
export const CONFIG = {
  ...CLIENT_CONFIG,
  evolution: {
    ...CLIENT_CONFIG.evolution,
    GP: {
      ...CLIENT_CONFIG.evolution.GP,
      initialPopulationFile: path.join(ROOT, "examples", "setup", "setupfile.json"),
    },
  },
} as const satisfies FlowRuntimeConfig
