/**
 * Serialize error objects for logging (strips circular refs, functions, etc.)
 */
export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 5).join("\n"), // First 5 lines
      cause: error.cause ? serializeError(error.cause) : undefined,
    }
  }
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error))
    } catch {
      return { serializedValue: String(error) }
    }
  }
  return { value: String(error) }
}
