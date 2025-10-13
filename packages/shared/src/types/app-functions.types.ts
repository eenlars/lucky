/**
 * Extended database types for custom app schema functions
 * These functions are created via migrations and need to be manually typed
 * until Supabase's type generator includes them.
 */

import type { Database } from "./app.types"

export type UpsertErrorParams = {
  p_location: string
  p_env: string
  p_error: Database["app"]["Tables"]["errors"]["Row"]["error"]
  p_message: string
  p_stack: string | null
  p_severity: Database["app"]["Enums"]["severity_level"]
  p_clerk_id: string | null
  p_hash: string
}

export type UpsertErrorResult = {
  id: number
  total_count: number
  last_seen: string
  hash: string
}

/**
 * Extended database type that includes custom RPC functions
 */
export interface DatabaseWithAppFunctions extends Database {
  app: Database["app"] & {
    Functions: Database["app"]["Functions"] & {
      upsert_error: {
        Args: UpsertErrorParams
        Returns: UpsertErrorResult[]
      }
    }
  }
}
