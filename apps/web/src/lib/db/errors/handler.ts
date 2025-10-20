import { DatabaseError } from "@/lib/db/errors/errors"

/**
 * Type guard to check if an error is a DatabaseError or Supabase error
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
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
