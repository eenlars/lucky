import { requireAuthWithApiKey } from "@/lib/api-auth"
import { alrighty, fail } from "@/lib/api/server"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ wf_version_id: string }> }) {
  // Require authentication
  const authResult = await requireAuthWithApiKey(req)
  if (authResult instanceof NextResponse) return authResult

  const supabase = await createRLSClient()
  const { wf_version_id } = await params

  try {
    const { data, error } = await supabase
      .from("WorkflowVersion")
      .select("*")
      .eq("wf_version_id", wf_version_id)
      .single()

    if (error) {
      return fail("workflow/version/[wf_version_id]", error.message, { code: "DB_ERROR", status: 500 })
    }

    if (!data) {
      return fail("workflow/version/[wf_version_id]", `Workflow version ${wf_version_id} not found`, {
        code: "NOT_FOUND",
        status: 404,
      })
    }

    return alrighty("workflow/version/[wf_version_id]", data)
  } catch (error) {
    console.error("Error fetching workflow version:", error)
    return fail("workflow/version/[wf_version_id]", "Failed to fetch workflow version", {
      code: "FETCH_ERROR",
      status: 500,
    })
  }
}
