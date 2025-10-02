// Integration test setup - NO MOCKS, real environment
import { vi } from "vitest"

// Make vi globally available
declare global {
  var vi: typeof import("vitest").vi
}
global.vi = vi

import path from "node:path"
// Load real environment variables from .env files
import dotenv from "dotenv"

// Load environment variables from repo root using PATHS
import { PATHS } from "@core/core-config/compat"
dotenv.config({ path: path.join(PATHS.root, ".env") })
dotenv.config({ path: path.join(PATHS.root, ".env.local") })

// Ensure required environment variables are set - error if missing
const requiredEnvVars = ["GOOGLE_API_KEY", "OPENAI_API_KEY", "SUPABASE_ANON_KEY", "SUPABASE_PROJECT_ID"]

const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables for integration tests: ${missingVars.join(", ")}. Please set these in your .env file.`,
  )
}

// Set up test-specific environment
process.env.NODE_ENV = "test"

// Note: MCP tests (*.spec.test.ts in tools/mcp/__tests__/) should set up their own
// MCP_SECRET_PATH if needed. General tests don't require MCP configuration.
