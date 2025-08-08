// Integration test setup - NO MOCKS, real environment
import { vi } from "vitest"

// Make vi globally available
declare global {
  var vi: typeof import("vitest").vi
}
global.vi = vi

// Load real environment variables from .env files
import dotenv from "dotenv"
import path from "path"

// Load environment variables from project root
dotenv.config({ path: path.join(process.cwd(), ".env") })
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

// Ensure required environment variables are set - error if missing
const requiredEnvVars = [
  'GOOGLE_API_KEY',
  'OPENAI_API_KEY', 
  'ANTHROPIC_API_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PROJECT_ID'
]

const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables for integration tests: ${missingVars.join(', ')}. Please set these in your .env file.`)
}

// Set up test-specific environment
process.env.NODE_ENV = "test"
