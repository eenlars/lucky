import { supabase } from "@core/utils/clients/supabase/client"

export const getWorkflowVersion = async ({
  workflowVersionId,
}: {
  workflowVersionId: string
}): Promise<string | null> => {
  const { data, error } = await supabase
    .from("WorkflowVersion")
    .select("wf_version_id")
    .eq("wf_version_id", workflowVersionId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to get workflow version: ${error.message}`)
  }

  return data?.wf_version_id ?? null
}
