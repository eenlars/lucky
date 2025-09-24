/**
 * adaptiveTools.ts - Tools with hidden constraints to test adaptive behavior
 */
import { tool, zodSchema } from "ai"
import { z } from "zod"

// Tool 1: Object fetcher with hidden limit of 3
const ObjectFetcherParams = z.object({
  query: z.coerce.string().describe("Query to describe what objects to fetch"),
  count: z.coerce.number().int().min(1).describe("Number of objects to fetch"),
})

export function objectFetcherFn({
  query,
  count,
}: {
  query: string
  count: number
}): Promise<string[]> {
  // Input validation
  if (typeof query !== "string" || query.trim().length === 0) {
    return Promise.resolve([
      "Request failed - the query parameter seems too high. Try again with different parameters.",
    ])
  }

  if (!Number.isInteger(count) || count < 1) {
    return Promise.resolve([
      "Request failed - the count parameter seems too high. Try again with different parameters.",
    ])
  }

  // Hidden constraint: can only fetch max 3 objects at once
  if (count > 3) {
    return Promise.resolve([
      "Request failed - the count parameter seems too high. Try again with different parameters.",
    ])
  }

  // Simulate fetching objects
  return Promise.resolve(
    Array(count)
      .fill(0)
      .map((_, i) => `${query.trim()}_object_${i + 1}`)
  )
}

export const objectFetcherSpec = tool({
  description:
    "Fetches objects based on query and count. Returns array of objects.",
  inputSchema: zodSchema(ObjectFetcherParams),
  execute: objectFetcherFn,
})

// Tool 2: Result aggregator (permissive at schema, strict at runtime)

export const resultAggregatorSpec = tool({
  description:
    "Combines multiple result arrays into a single aggregated result",
  // Make argument schema permissive so bad calls don't abort the whole run
  inputSchema: zodSchema(z.object({ results: z.unknown() })),
  execute: async (
    { results }: { results?: unknown } = {},
    _options?: unknown
  ): Promise<
    string | { total_count: number; combined_items: string[]; summary: string }
  > => {
    // Normalize different shapes to a string[] or return an error string
    const normalizeToStrings = (val: unknown): string[] | string => {
      if (!Array.isArray(val)) return "ERROR: Results must be an array"
      // Flatten one level (Node>=12 supports Array.prototype.flat)
      const flat = (val as unknown[]).flat(1) as unknown[]
      if (!flat.every((item) => typeof item === "string")) {
        return "ERROR: All result items must be strings"
      }
      return flat as string[]
    }

    const normalized = normalizeToStrings(results)
    if (typeof normalized === "string") return normalized

    return {
      total_count: normalized.length,
      combined_items: normalized,
      summary: `Successfully combined ${normalized.length} items`,
    }
  },
})

export function resultAggregatorFn({ results }: { results: string[] }): object {
  // Input validation
  if (!Array.isArray(results)) {
    throw new Error("Results must be an array")
  }

  if (results.length === 0) {
    throw new Error("Results array cannot be empty")
  }

  // Validate all items are strings
  if (!results.every((item) => typeof item === "string")) {
    throw new Error("All result items must be strings")
  }

  return {
    total_count: results.length,
    combined_items: results,
    summary: `Successfully combined ${results.length} items`,
  }
}

// Combined tools export
export const adaptiveTools = {
  fetch_objects: objectFetcherSpec,
  combine_results: resultAggregatorSpec,
}

export const adaptiveToolSpecs = [objectFetcherSpec, resultAggregatorSpec]
export const adaptiveToolOrder = ["fetch_objects", "combine_results"]
