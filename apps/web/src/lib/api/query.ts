import { type NextRequest, NextResponse } from "next/server"
import type { z } from "zod"
import { type Endpoint, apiSchemas } from "./schemas"

/**
 * Extract query type from endpoint schema
 */
export type Query<E extends Endpoint> = (typeof apiSchemas)[E] extends { query: infer Q }
  ? Q extends z.ZodTypeAny
    ? z.infer<Q>
    : never
  : never

/**
 * Validates and parses URL search parameters using the `query` schema
 * from apiSchemas[endpoint].
 *
 * Usage in a route handler:
 *   const params = await handleQuery('workflow/invocations', req)
 *   if (isHandleQueryError(params)) return params
 *   // params is now typed as Query<'workflow/invocations'>
 */
export function handleQuery<E extends Endpoint>(endpoint: E, req: NextRequest): Query<E> | NextResponse {
  try {
    const querySchema = (apiSchemas[endpoint] as any)?.query as z.ZodTypeAny | undefined

    if (!querySchema) {
      return NextResponse.json({ error: `No query schema defined for ${String(endpoint)}` }, { status: 500 })
    }

    // Extract all search params from URL
    const searchParams = req.nextUrl.searchParams
    const raw: Record<string, string | string[]> = {}

    // Convert URLSearchParams to object
    // Handle multiple values for same key as array
    for (const [key, value] of searchParams.entries()) {
      const existing = raw[key]
      if (existing !== undefined) {
        raw[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
      } else {
        raw[key] = value
      }
    }

    const result = querySchema.safeParse(raw)
    if (result.success) return result.data as Query<E>

    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Query parameters failed validation",
          issues: result.error.issues,
        },
      },
      { status: 400 },
    )
  } catch (e) {
    console.error("handleQuery error:", e)
    return NextResponse.json(
      {
        error: {
          code: "HANDLE_QUERY_ERROR",
          message: e instanceof Error ? e.message : "Unknown error during query handling",
        },
      },
      { status: 500 },
    )
  }
}

/**
 * Type guard to check if handleQuery returned an error response
 */
export const isHandleQueryError = (x: unknown): x is NextResponse => x instanceof NextResponse
