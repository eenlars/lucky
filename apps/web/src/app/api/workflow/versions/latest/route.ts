import { requireAuth } from "@/lib/api-auth"
import { alrighty, fail } from "@/lib/api/server"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult) return authResult

  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams
  const limit = Number.parseInt(searchParams.get("limit") || "200", 10)

  try {
    const { data, error } = await supabase
      .from("WorkflowVersion")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      return fail("workflow/versions/latest", error.message, { code: "DB_ERROR", status: 500 })
    }

    return alrighty("workflow/versions/latest", data || [])
  } catch (error) {
    console.error("Error fetching latest workflow versions:", error)
    return fail("workflow/versions/latest", "Failed to fetch workflow versions", { code: "FETCH_ERROR", status: 500 })
  }
}
