import { nodeInvocations } from "@/trace-visualization/db/Workflow/nodeInvocations"
import { supabase } from "@core/utils/clients/supabase/client"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

export async function GET(_request: Request, { params }: { params: Promise<{ wf_inv_id: string }> }) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { wf_inv_id } = await params

    // Verify the workflow invocation exists
    const { data: exists, error: existsError } = await supabase
      .from("WorkflowInvocation")
      .select("wf_invocation_id")
      .eq("wf_invocation_id", wf_inv_id)
      .limit(1)

    if (existsError) {
      console.error("Error verifying workflow invocation existence:", existsError)
      return NextResponse.json({ error: "Failed to verify trace" }, { status: 500 })
    }

    if (!exists || exists.length === 0) {
      return NextResponse.json({ error: "Trace not found" }, { status: 404 })
    }

    const result = await nodeInvocations(wf_inv_id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in node invocations API:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
