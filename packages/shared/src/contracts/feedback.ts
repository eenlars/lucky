/**
 * Feedback contracts for user feedback submission.
 * Defines schemas for feedback context and submission.
 */

import { z } from "zod"

// ============================================================================
// FEEDBACK CONTEXT
// ============================================================================

/**
 * Browser and environment context captured when user submits feedback
 */
export const feedbackContextSchema = z.object({
  url: z.string().url(),
  pathname: z.string(),
  search: z.string(),
  userAgent: z.string(),
  screen: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  viewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  timestamp: z.string().datetime(),
})

export type FeedbackContext = z.infer<typeof feedbackContextSchema>

// ============================================================================
// FEEDBACK SUBMISSION
// ============================================================================

/**
 * Feedback submission payload from client
 */
export const feedbackSubmissionSchema = z.object({
  content: z.string().min(1).max(10000),
  context: z.string().transform((str, ctx) => {
    try {
      const parsed = JSON.parse(str)
      return feedbackContextSchema.parse(parsed)
    } catch (_error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid context JSON",
      })
      return z.NEVER
    }
  }),
})

export type FeedbackSubmission = z.infer<typeof feedbackSubmissionSchema>

// ============================================================================
// DATABASE FEEDBACK RECORD
// ============================================================================

/**
 * Feedback record as stored in database
 */
export const feedbackRecordSchema = z.object({
  feedback_id: z.string(),
  clerk_id: z.string().nullable(),
  content: z.string(),
  context: feedbackContextSchema.nullable(),
  status: z.enum(["new", "reviewed", "resolved", "archived"]).nullable(),
  created_at: z.string().datetime().nullable(),
})

export type FeedbackRecord = z.infer<typeof feedbackRecordSchema>
