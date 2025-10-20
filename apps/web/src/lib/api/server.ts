import { type NextRequest, NextResponse } from "next/server"
import type { z } from "zod"
import { type Endpoint, type Req, type Res, apiSchemas } from "./schemas"

/**
 * Helper: turn FormData into a plain object of string | File
 * If you need numbers/booleans, coerce in your Zod schema with z.coerce.*
 */
const formDataToObject = (fd: FormData) => Object.fromEntries(fd.entries())

/**
 * Validates and parses a request body using the `req` schema
 * from apiSchemas[endpoint]. Supports JSON and multipart/form-data.
 *
 * Usage in a route handler:
 *   const parsed = await handleBody('call', req)
 *   if (isHandleBodyError(parsed)) return parsed
 *   // parsed is now typed as Req<'call'>
 */
export async function handleBody<E extends Endpoint>(endpoint: E, req: NextRequest): Promise<Req<E> | NextResponse> {
  try {
    const { method } = req
    if (method === "OPTIONS" || method === "HEAD") {
      return NextResponse.json({ error: "This method does not support request bodies" }, { status: 400 })
    }

    const contentType = req.headers.get("Content-Type") || ""
    let raw: unknown

    try {
      if (contentType.includes("multipart/form-data")) {
        const fd = await req.formData()
        raw = formDataToObject(fd)
      } else if (contentType.includes("application/json")) {
        raw = await req.json()
      } else if (contentType === "" && (req.method === "GET" || req.method === "DELETE")) {
        // No body expected, allow empty body if your schema is z.never() or optional
        raw = undefined
      } else {
        throw new Error("Unsupported Content-Type")
      }
    } catch (e) {
      if (e instanceof SyntaxError && e.message.includes("Unexpected end of JSON input")) {
        return NextResponse.json({ error: "Check the body, and check if this is a POST/PUT request" }, { status: 400 })
      }
      throw e
    }

    // No req schema defined: treat as no body
    const reqSchema = apiSchemas[endpoint]?.req as z.ZodTypeAny | undefined
    if (!reqSchema) {
      return NextResponse.json({ error: `No request schema defined for ${String(endpoint)}` }, { status: 500 })
    }

    const result = reqSchema.safeParse(raw)
    if (result.success) return result.data as Req<E>

    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request body failed validation",
          issues: result.error.issues,
        },
      },
      { status: 400 },
    )
  } catch (e) {
    console.error("handleBody error:", e)
    return NextResponse.json(
      {
        error: {
          code: "HANDLE_BODY_ERROR",
          message: e instanceof Error ? e.message : "Unknown error during body handling",
        },
      },
      { status: 500 },
    )
  }
}

export const isHandleBodyError = (x: unknown): x is NextResponse => x instanceof NextResponse

/**
 * Creates a typed JSON response that is validated against the
 * apiSchemas[endpoint].res schema *before* sending to the client.
 *
 * Usage:
 *   return ok('call', { success: true, data: {...} })
 */
export function alrighty<E extends Endpoint>(endpoint: E, payload: Res<E>, init?: ResponseInit): NextResponse {
  const schema = apiSchemas[endpoint].res
  const parsed = schema.parse(payload)
  return NextResponse.json(parsed, init)
}

/**
 * Convenience for the common { success:false, error } shape.
 * Works if your endpoint's res schema accepts that shape.
 */
export function fail<E extends Endpoint>(
  endpoint: E,
  message: string,
  options?: { code?: string; status?: number },
): NextResponse {
  const body: unknown = {
    success: false,
    error: {
      code: options?.code ?? "INTERNAL_ERROR",
      message,
      timestamp: new Date().toISOString(),
    },
  }
  const schema = apiSchemas[endpoint].res
  const parsed = schema.parse(body)
  return NextResponse.json(parsed, { status: options?.status ?? 500 })
}
