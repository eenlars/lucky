import { requireAuth } from "@/lib/api-auth"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest, context: { params: Promise<{ wf_id: string }> }) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const supabase = await createClient()
  const { wf_id } = await context.params

  try {
    const { data, error } = await supabase
      .from("Workflow")
      .select(
        `
        *,
        versions:WorkflowVersion(*)
      `,
      )
      .eq("wf_id", wf_id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Workflow not found" }, { status: 404 })
    }

    const sortedVersions = (data.versions || []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

    return NextResponse.json({
      ...data,
      versions: sortedVersions,
    })
  } catch (error) {
    console.error("Error fetching workflow:", error)
    return NextResponse.json({ error: "Failed to fetch workflow" }, { status: 500 })
  }
}
