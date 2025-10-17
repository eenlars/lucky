import { alrighty } from "@/lib/api/server"
import { createClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  // Require authentication
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

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

    return alrighty("workflow/versions/latest", data || [])
  } catch (error) {
    console.error("Error fetching latest workflow versions:", error)
    return NextResponse.json({ error: "Failed to fetch workflow versions" }, { status: 500 })
  }
}
