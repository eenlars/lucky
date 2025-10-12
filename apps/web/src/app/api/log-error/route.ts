import crypto from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { type DatabaseWithAppFunctions, ErrorReportSchema } from "@lucky/shared"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

type Json = DatabaseWithAppFunctions["app"]["Tables"]["errors"]["Row"]["error"]

// Convert unknown value to JSON-compatible type, ensuring it's serializable
function toJson(value: unknown): Json {
  if (value === null || value === undefined) {
    return null
  }
  // Serialize and parse to ensure JSON compatibility and remove non-serializable values
  try {
    const stringified = JSON.stringify(value)
    const parsed = JSON.parse(stringified)
    // After JSON round-trip, the value is guaranteed to be JSON-compatible
    // Type assertion is safe here because JSON.parse always returns Json-compatible types
    return parsed satisfies Json
  } catch {
    return null
  }
}

// Type guard to check if value is a record
function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val)
}

// Deterministic JSON stringify with sorted keys
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value !== "object") return JSON.stringify(value)

  const seen = new WeakSet()
  const sorter = (val: unknown): unknown => {
    if (val && typeof val === "object") {
      if (seen.has(val)) return "[Circular]"
      seen.add(val)

      if (Array.isArray(val)) return val.map(sorter)

      if (isRecord(val)) {
        const obj: Record<string, unknown> = {}
        for (const key of Object.keys(val).sort()) {
          obj[key] = sorter(val[key])
        }
        return obj
      }
    }
    return val
  }

  return JSON.stringify(sorter(value))
}

function computeHash(parts: {
  location: string
  env: "production" | "development"
  error: unknown
  message: string
  severity: "info" | "warn" | "error"
}): string {
  const errorStr = stableStringify(parts.error)
  const payload = [parts.location, parts.env, errorStr, parts.message, parts.severity].join("|")
  return crypto.createHash("sha256").update(payload).digest("hex")
}

export async function POST(request: NextRequest) {
  try {
    const input = await request.json()
    const data = ErrorReportSchema.parse(input)

    const hash = computeHash({
      location: data.location,
      env: data.env,
      error: data.error ?? null,
      message: data.message,
      severity: data.severity,
    })

    const supabase = await createClient()

    // Note: For atomic upsert with count increment, apply migration:
    // packages/shared/migrations/0001_app_upsert_error.sql
    // After applying the migration and regenerating types, this can be updated to use the RPC function.
    //
    // Current implementation: Native Supabase upsert with onConflict
    // This is atomic for the insert/update operation, though it won't increment total_count.
    // For error logging, this trade-off is acceptable.
    const { data: record, error } = await supabase
      .schema("app")
      .from("errors")
      .upsert(
        {
          location: data.location,
          env: data.env,
          error: toJson(data.error),
          message: data.message,
          stack: data.stack ?? null,
          severity: data.severity,
          clerk_id: data.clerkId ?? null,
          hash: hash,
          // These will be used on insert, ignored on update:
          total_count: 1,
          last_seen: new Date().toISOString(),
        },
        {
          onConflict: "hash",
          ignoreDuplicates: false,
        },
      )
      .select("id, total_count, last_seen, hash")
      .single()

    if (error) {
      console.error("log-error upsert failed:", error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, result: record })
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error")
    console.error("log-error failed:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  }
}
