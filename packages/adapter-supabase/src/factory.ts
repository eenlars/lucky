/**
 * Factory function for creating persistence instances.
 * Supports dependency injection and environment-based configuration.
 */

import { InMemoryPersistence } from "./memory-persistence"
import type { IPersistence } from "./persistence-interface"
import { SupabasePersistence } from "./supabase-persistence"

export interface PersistenceConfig {
  backend?: "supabase" | "memory"
  useMock?: boolean
}

/**
 * Create a persistence instance based on configuration.
 *
 * Graceful degradation behavior:
 * - If backend is explicitly set to "supabase" and credentials are missing, throws error
 * - If backend is auto-detected and Supabase credentials are missing, falls back to in-memory
 * - Logs warning when automatic fallback occurs
 *
 * @param config - Configuration object
 * @returns IPersistence implementation
 *
 * @example
 * ```ts
 * // Use Supabase (requires SUPABASE_PROJECT_ID and SUPABASE_ANON_KEY env vars)
 * // Throws if credentials missing
 * const persistence = createPersistence({ backend: "supabase" })
 *
 * // Use in-memory (for tests)
 * const persistence = createPersistence({ backend: "memory" })
 *
 * // Auto-detect with graceful fallback
 * // Falls back to memory if Supabase credentials missing
 * const persistence = createPersistence()
 * ```
 */
export function createPersistence(config: PersistenceConfig = {}): IPersistence {
  const { backend, useMock } = config

  // Check environment variable if not explicitly set
  const shouldUseMock = useMock ?? process.env.USE_MOCK_PERSISTENCE === "true"

  // Determine backend
  let selectedBackend = backend
  const isExplicitBackend = backend !== undefined

  if (!selectedBackend) {
    selectedBackend = shouldUseMock ? "memory" : "supabase"
  }

  if (selectedBackend === "memory") {
    return new InMemoryPersistence()
  }

  // Try to create Supabase persistence
  try {
    return new SupabasePersistence()
  } catch (error) {
    // If backend was explicitly set to "supabase", don't fall back - throw the error
    if (isExplicitBackend) {
      throw error
    }

    // Auto-detect mode: fall back to in-memory persistence
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.warn(
      `\n⚠️  Supabase credentials not configured, using in-memory persistence.\n   Data will not persist across restarts.\n   ${errorMessage.split("\n")[0]}\n   To use Supabase, set SUPABASE_PROJECT_ID and SUPABASE_ANON_KEY.\n   To silence this warning, set USE_MOCK_PERSISTENCE=true\n`,
    )

    return new InMemoryPersistence()
  }
}
