import { authenticateRequest } from "@/lib/auth/principal"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/user/workflows
 *
 * Returns all workflows owned by the authenticated user, including
 * the latest version's input/output schemas for MCP discovery.
 *
 * Supports both API key (Bearer token) and Clerk session authentication.
 *
 * Response format:
 * [
 *   {
 *     workflow_id: string,
 *     name: string,
 *     description?: string,
 *     inputSchema?: JSONSchema7,
 *     outputSchema?: JSONSchema7,
 *     created_at: string
 *   }
 * ]
 */
export async function GET(req: NextRequest) {
  try {
    // Unified authentication: API key or Clerk session
    const principal = await authenticateRequest(req)
    if (!principal) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use RLS client for automatic user isolation
    const supabase = await createRLSClient()

    // Query workflows with their versions (RLS automatically filters by clerk_id)
    const { data, error } = await supabase
      .from("Workflow")
      .select(
        `
        wf_id,
        description,
        created_at,
        versions:WorkflowVersion(
          wf_version_id,
          dsl,
          created_at
        )
      `,
      )
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[GET /api/user/workflows] Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json([])
    }

    // Transform data to include latest version's schemas
    const workflows = data.map(wf => {
      // Sort versions by created_at descending to get latest
      const sortedVersions = (wf.versions || []).sort(
        (a: { created_at: string }, b: { created_at: string }) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      const latestVersion = sortedVersions[0]
      const config = latestVersion?.dsl as any

      return {
        workflow_id: wf.wf_id,
        name: wf.wf_id, // Use wf_id as name (human-readable identifier)
        description: wf.description || undefined,
        inputSchema: config?.inputSchema || undefined,
        outputSchema: config?.outputSchema || undefined,
        created_at: wf.created_at,
      }
    })

    return NextResponse.json(workflows)
  } catch (error) {
    logException(error, {
      location: "/api/user/workflows/GET",
    })
    console.error("[GET /api/user/workflows] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
