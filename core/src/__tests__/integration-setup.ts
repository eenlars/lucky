// Integration test setup - NO MOCKS, real environment
import fs from "fs"
import { vi } from "vitest"

// Make vi globally available
declare global {
  var vi: typeof import("vitest").vi
}
global.vi = vi

// Load real environment variables from .env files
import dotenv from "dotenv"
import path from "path"

// Load environment variables from repo root using PATHS
import { PATHS } from "@runtime/settings/constants"
dotenv.config({ path: path.join(PATHS.root, ".env") })
dotenv.config({ path: path.join(PATHS.root, ".env.local") })

// Ensure required environment variables are set - error if missing
const requiredEnvVars = [
  "GOOGLE_API_KEY",
  "OPENAI_API_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PROJECT_ID",
]

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])
if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables for integration tests: ${missingVars.join(", ")}. Please set these in your .env file.`
  )
}

// Set up test-specific environment
process.env.NODE_ENV = "test"

// Point MCP loader to the real mcp-secret.json if it exists; otherwise leave unset
try {
  // repo root from core/src/__tests__ level
  const REPO_ROOT = path.resolve(__dirname, "../../../..")
  const SRC_SECRET = path.join(REPO_ROOT, "runtime", "mcp-secret.json")
  if (fs.existsSync(SRC_SECRET)) {
    process.env.MCP_SECRET_PATH = SRC_SECRET
  }
} catch {}
