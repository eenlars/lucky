import { nodeInvocations } from "@/features/trace-visualization/db/Workflow/nodeInvocations"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function GET(_request: Request, { params }: { params: Promise<{ wf_inv_id: string }> }) {
  // Require authentication
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  const supabase = await createRLSClient()

  try {
    const { wf_inv_id } = await params

    // Verify the workflow invocation exists and user has access (RLS will enforce)
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
