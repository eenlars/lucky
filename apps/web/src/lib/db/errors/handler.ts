import { DatabaseError } from "@/lib/db/errors/errors"

// Union type for database-related errors
export type DatabaseRelatedError = DatabaseError | SupabaseError

// Type for Supabase PostgrestError
export interface SupabaseError {
  code?: string
  message?: string
  details?: string
  hint?: string
}

/**
 * Type guard to check if an error is a DatabaseError or Supabase error
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  // Only return true for actual DatabaseError instances to maintain type safety
  return error instanceof DatabaseError
}

/**
 * Type guard to check if an error is a database-related error (DatabaseError or Supabase error)
 */
export function isDatabaseRelatedError(error: unknown): error is DatabaseRelatedError {
  if (error instanceof DatabaseError) {
    return true
  }

  // Check for Supabase PostgrestError
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    const supabaseError = error as { code?: string; message?: string }
    return typeof supabaseError.code === "string" && typeof supabaseError.message === "string"
  }

  return false
}
