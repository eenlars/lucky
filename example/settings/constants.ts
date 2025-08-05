/**
 * Server-side constants with full path configuration.
 * This file should only be imported in server-side code.
 * For client-side code, use constants.client.ts
 */
import path from "path"
import { fileURLToPath } from "url"

// Import client-safe constants
import type {
  FlowEvolutionConfig,
  FlowPathsConfig,
} from "@core/utils/config/runtimeConfig.types"
import { CONFIG as CLIENT_CONFIG } from "./constants.client"
import { MODELS } from "./models"

// Re-export MODELS for compatibility
export { MODELS }

/* ---------- PATHS ---------- */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, "..", "..") // repo root
const RUNTIME = path.join("src", "runtime")
const LOGGING_FOLDER = path.join("src", "runtime", "logging_folder")
const MEMORY_ROOT = path.join(LOGGING_FOLDER, "memory")

export const PATHS: FlowPathsConfig = {
  root: ROOT,
  app: path.join(ROOT, "app"),
  runtime: RUNTIME,
  codeTools: path.join(RUNTIME, "code_tools"),
  setupFile: path.join(RUNTIME, "setup", "setupfile.json"),
  improver: path.join(RUNTIME, "setup", "improve.json"),
  node: {
    logging: LOGGING_FOLDER, // this
    memory: {
      root: MEMORY_ROOT,
      workfiles: path.join(MEMORY_ROOT, "workfiles"),
    },
    error: path.join(LOGGING_FOLDER, "error"),
  },
} as const satisfies FlowPathsConfig

export const CONFIG = CLIENT_CONFIG

const EVOLUTION_CONFIG: FlowEvolutionConfig = {
  mode: "GP",
  generationAmount: 3,
  initialPopulationFile: path.join(
    ROOT,
    "src",
    "runtime",
    "setup",
    "setupfile.json"
  ),
  initialPopulationMethod: "baseWorkflow",
  GP: {
    ...CLIENT_CONFIG.evolution.GP,
  },
}
