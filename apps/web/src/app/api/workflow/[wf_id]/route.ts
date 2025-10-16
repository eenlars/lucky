import { requireAuth } from "@/lib/api-auth"
import { alrighty, fail } from "@/lib/api/server"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest, context: { params: Promise<{ wf_id: string }> }) {
  const authResult = await requireAuth()
  if (authResult) return authResult

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
      return fail("workflow/[wf_id]", error?.message || "Workflow not found", {
        code: "NOT_FOUND",
        status: 404,
      })
    }

    const sortedVersions = (data.versions || []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

    return alrighty("workflow/[wf_id]", {
      ...data,
      versions: sortedVersions,
    })
  } catch (error) {
    console.error("Error fetching workflow:", error)
    return fail("workflow/[wf_id]", "Failed to fetch workflow", {
      code: "INTERNAL_ERROR",
      status: 500,
    })
  }
}
