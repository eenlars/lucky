/**
 * Error reporting contract for application error logging.
 * Defines the structure for reporting errors to the app.errors table.
 */

import { z } from "zod"

// ============================================================================
// ERROR REPORTING
// ============================================================================

export const SeverityLevelSchema = z.enum(["info", "warn", "warning", "error"]).default("error")

export const ErrorReportSchema = z.object({
  location: z.string().min(1),
  env: z.enum(["production", "development"]),
  // Accept anything JSON-ish; will be stringified after canonicalization
  error: z.unknown().optional().nullable(),
  message: z.string().min(1),
  stack: z.string().optional().nullable(),
  severity: SeverityLevelSchema,
  clerkId: z.string().optional().nullable(),
})

export type SeverityLevel = z.infer<typeof SeverityLevelSchema>
export type ErrorReportInput = z.infer<typeof ErrorReportSchema>
