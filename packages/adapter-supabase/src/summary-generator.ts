/**
 * Simple summary generator for context store.
 * This is a placeholder - in production, this would use an AI model.
 */

export async function generateSummaryFromUnknownData(data: unknown): Promise<{ summary: string }> {
  if (data === null || data === undefined) {
    return { summary: "null or undefined value" }
  }

  if (typeof data === "string") {
    const preview = data.length > 100 ? `${data.substring(0, 100)}...` : data
    return { summary: `String (${data.length} chars): ${preview}` }
  }

  if (typeof data === "number") {
    return { summary: `Number: ${data}` }
  }

  if (typeof data === "boolean") {
    return { summary: `Boolean: ${data}` }
  }

  if (Array.isArray(data)) {
    return { summary: `Array with ${data.length} items` }
  }

  if (data instanceof Blob) {
    return { summary: `Blob (${data.size} bytes, type: ${data.type || "unknown"})` }
  }

  if (data instanceof ArrayBuffer) {
    return { summary: `ArrayBuffer (${data.byteLength} bytes)` }
  }

  if (typeof data === "object") {
    const keys = Object.keys(data as object)
    const preview = keys.slice(0, 5).join(", ")
    const more = keys.length > 5 ? ` and ${keys.length - 5} more` : ""
    return { summary: `Object with keys: ${preview}${more}` }
  }

  return { summary: "Unknown data type" }
}
