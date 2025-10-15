import { lgg } from "@core/utils/logging/Logger"
import type { WorkflowEventHandler, WorkflowProgressEvent } from "@lucky/shared"

/**
 * Sanitizes text for safe inclusion in events (prevents XSS, log injection).
 * Removes control characters, null bytes, and dangerous Unicode.
 *
 * @param text - Text to sanitize
 * @returns Sanitized text safe for event emission and HTML contexts
 */
export function sanitizeEventText(text: string): string {
  return (
    text
      // biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally removing control characters for security
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove ASCII control chars
      // biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally removing control characters for security
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove Unicode control chars
      .replace(/[\uFFFD\uFFFE\uFFFF]/g, "") // Remove replacement/invalid chars
      .replace(/[<>]/g, "") // Remove HTML brackets (basic XSS protection)
      .trim()
  )
}

/**
 * Truncates output for event emission to prevent huge payloads.
 * Handles edge cases: null, undefined, objects, arrays, binary data.
 * Applies sanitization to prevent XSS and log injection.
 *
 * @param output - The output to truncate (any type)
 * @param maxLength - Maximum length in characters (default: 200)
 * @returns Truncated and sanitized string safe for event emission
 */
export function truncateOutput(output: unknown, maxLength = 200): string {
  if (output === null || output === undefined) return ""

  let str: string
  try {
    str = typeof output === "string" ? output : JSON.stringify(output)
  } catch {
    // Handle circular references or non-serializable objects
    return "[Non-serializable output]"
  }

  // Check for binary data (null bytes or replacement characters)
  if (str.includes("\x00") || str.includes("�")) {
    return "[Binary output]"
  }

  // Sanitize before truncation to ensure clean data
  str = sanitizeEventText(str)

  if (str.length <= maxLength) return str

  return `${str.slice(0, maxLength)}...`
}

/**
 * Safely invokes event handler with error isolation.
 * Event handler failures must NEVER crash workflow execution.
 *
 * @param handler - Optional event handler callback
 * @param event - Progress event to emit
 * @param context - Context string for error logging (e.g., "queueRun")
 */
export async function safeEmit(
  handler: WorkflowEventHandler | undefined,
  event: WorkflowProgressEvent,
  context: string,
): Promise<void> {
  if (!handler) return

  try {
    await handler(event)
  } catch (error) {
    // Log error but never throw - event handler failures must not crash workflow
    lgg.error(`[${context}] Event handler failed:`, error instanceof Error ? error.message : String(error))
  }
}
