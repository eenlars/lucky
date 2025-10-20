/**
 * SERVER-ONLY exports from @lucky/models
 *
 * DO NOT import this in client-side code.
 * Use import from '@lucky/models/server'
 *
 * This module re-exports the simplified models API for server use.
 */

// Runtime guard: Fail immediately if imported in browser context
if (typeof globalThis !== "undefined" && "window" in globalThis && (globalThis as { window?: unknown }).window) {
  throw new Error(
    "[SECURITY] models/server.ts cannot be imported in client-side code. " +
      "This file is marked as server-only. " +
      "Import from '@lucky/models' instead for client-safe model utilities.",
  )
}

// Re-export everything from index for server use
export * from "./index"
