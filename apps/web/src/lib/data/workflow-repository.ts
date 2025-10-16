import type { Principal } from "@/lib/auth/principal"
import { createScopedClient } from "@/lib/data/scoped-client"
import type { PostgrestSingleResponse } from "@supabase/supabase-js"

type WorkflowVersionRow = {
  workflow_id: string
  dsl: unknown
}

type WorkflowWithVersionsRow = {
  wf_id: string
  clerk_id: string
  versions: Array<{
    wf_version_id: string
    dsl: unknown
    created_at: string
  }>
}

function stripJoin<T extends Record<string, unknown>>(row: T): T {
  const { Workflow: _ignored, ...rest } = row
  return rest as T
}

/**
 * Fetch a workflow version scoped to the principal's ownership.
 * Applies manual owner filtering when using the service-role client.
 */
function requireApiPrincipal(principal?: Principal): Principal & { auth_method: "api_key" } {
  if (!principal || principal.auth_method !== "api_key") {
    throw new Error("Service-role access requires an API key principal")
  }
  return principal as Principal & { auth_method: "api_key" }
}

export async function fetchWorkflowVersion(
  versionId: string,
  principal?: Principal,
): Promise<PostgrestSingleResponse<WorkflowVersionRow | null>> {
  const scoped = await createScopedClient(principal)
  console.log(`[workflow-repository] fetchWorkflowVersion(${versionId}) via ${scoped.mode} client`)

  if (scoped.mode === "service") {
    const apiPrincipal = requireApiPrincipal(principal)
    const response = await scoped.client
      .from("WorkflowVersion")
      .select("workflow_id, dsl, Workflow!inner(clerk_id)")
      .eq("wf_version_id", versionId)
      .eq("Workflow.clerk_id", apiPrincipal.clerk_id)
      .maybeSingle()

    if (response.data) {
      return { ...response, data: stripJoin(response.data) }
    }
    return response
  }

  return scoped.client
    .from("WorkflowVersion")
    .select("workflow_id, dsl")
    .eq("wf_version_id", versionId)
    .maybeSingle()
}

/**
 * Fetch a workflow (latest version) scoped to the principal's ownership.
 * Applies manual owner filtering when using the service-role client.
 */
export async function fetchWorkflowWithVersions(
  workflowId: string,
  principal?: Principal,
): Promise<PostgrestSingleResponse<WorkflowWithVersionsRow | null>> {
  const scoped = await createScopedClient(principal)
  console.log(`[workflow-repository] fetchWorkflowWithVersions(${workflowId}) via ${scoped.mode} client`)

  if (scoped.mode === "service") {
    const apiPrincipal = requireApiPrincipal(principal)
    return scoped.client
      .from("Workflow")
      .select(
        `
        wf_id,
        clerk_id,
        versions:WorkflowVersion(
          wf_version_id,
          dsl,
          created_at
        )
      `,
      )
      .eq("wf_id", workflowId)
      .eq("clerk_id", apiPrincipal.clerk_id)
      .maybeSingle()
  }

  return scoped.client
    .from("Workflow")
    .select(
      `
      wf_id,
      clerk_id,
      versions:WorkflowVersion(
        wf_version_id,
        dsl,
        created_at
      )
    `,
    )
    .eq("wf_id", workflowId)
    .maybeSingle()
}
