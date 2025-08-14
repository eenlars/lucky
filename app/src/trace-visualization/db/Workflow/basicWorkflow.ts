"use server"
import { supabase } from "@core/utils/clients/supabase/client"
import type { Tables } from "@lucky/shared"
import { cache } from "react"

export interface BasicWorkflowResult {
  workflowInvocation: Tables<"WorkflowInvocation">
  workflowVersion: Tables<"WorkflowVersion">
  workflow: Tables<"Workflow">
}

export const basicWorkflow = cache(
  async (workflowInvocationId: string): Promise<BasicWorkflowResult> => {
    const { data: workflow, error } = await supabase
      .from("WorkflowInvocation")
      .select(
        `
        *,
        WorkflowVersion (
          *,
          Workflow!WorkflowVersion_workflow_id_fkey ( * )
        )
      `
      )
      .eq("wf_invocation_id", workflowInvocationId)
      .single()

    if (error) throw error
    if (!workflow) throw new Error("Workflow not found")

    const { WorkflowVersion: workflowVersionRaw, ...workflowInvocation } =
      workflow
    const { Workflow: workflowRaw, ...workflowVersion } = workflowVersionRaw

    return {
      workflowInvocation,
      workflowVersion,
      workflow: workflowRaw,
    }
  }
)
