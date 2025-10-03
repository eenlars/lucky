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
 * @param config - Configuration object
 * @returns IPersistence implementation
 *
 * @example
 * ```ts
 * // Use Supabase (requires SUPABASE_PROJECT_ID and SUPABASE_ANON_KEY env vars)
 * const persistence = createPersistence({ backend: "supabase" })
 *
 * // Use in-memory (for tests)
 * const persistence = createPersistence({ backend: "memory" })
 *
 * // Auto-detect from USE_MOCK_PERSISTENCE env var
 * const persistence = createPersistence()
 * ```
 */
export function createPersistence(config: PersistenceConfig = {}): IPersistence {
  const { backend, useMock } = config

  // Check environment variable if not explicitly set
  const shouldUseMock = useMock ?? process.env.USE_MOCK_PERSISTENCE === "true"

  // Determine backend
  let selectedBackend = backend
  if (!selectedBackend) {
    selectedBackend = shouldUseMock ? "memory" : "supabase"
  }

  if (selectedBackend === "memory") {
    return new InMemoryPersistence()
  }

  return new SupabasePersistence()
}
