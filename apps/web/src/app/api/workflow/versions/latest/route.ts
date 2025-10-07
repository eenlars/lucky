import { requireAuth } from "@/lib/api-auth"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("Error fetching latest workflow versions:", error)
    return NextResponse.json({ error: "Failed to fetch workflow versions" }, { status: 500 })
  }
}
