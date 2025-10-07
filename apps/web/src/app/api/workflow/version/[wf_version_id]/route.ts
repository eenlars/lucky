import { requireAuth } from "@/lib/api-auth"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ wf_version_id: string }> }) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const supabase = await createClient()
  const { wf_version_id } = await params

  try {
    const { data, error } = await supabase
      .from("WorkflowVersion")
      .select("*")
      .eq("wf_version_id", wf_version_id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: `Workflow version ${wf_version_id} not found` }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching workflow version:", error)
    return NextResponse.json({ error: "Failed to fetch workflow version" }, { status: 500 })
  }
}
