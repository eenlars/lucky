"use server"
import { supabase } from "@/lib/supabase"
import type { Tables } from "@lucky/shared"
import { cache } from "react"

export interface BasicWorkflowResult {
  workflowInvocation: Tables<"WorkflowInvocation">
  workflowVersion: Tables<"WorkflowVersion">
  workflow: Tables<"Workflow">
}

export const basicWorkflow = cache(async (workflowInvocationId: string): Promise<BasicWorkflowResult | null> => {
  const { data, error } = await supabase
    .from("WorkflowInvocation")
    .select(
      `
        *,
        WorkflowVersion (
          *,
          Workflow!WorkflowVersion_workflow_id_fkey ( * )
        )
      `,
    )
    .eq("wf_invocation_id", workflowInvocationId)
    .limit(1)

  // Return null for not-found; only throw on actual fetch errors
  if (error) {
    throw new Error("Failed to fetch workflow details")
  }
  const workflow = data && Array.isArray(data) && data.length > 0 ? (data[0] as any) : null
  if (!workflow) return null

  const { WorkflowVersion: workflowVersionRaw, ...workflowInvocation } = workflow
  const { Workflow: workflowRaw, ...workflowVersion } = workflowVersionRaw

  return {
    workflowInvocation,
    workflowVersion,
    workflow: workflowRaw,
  }
})
