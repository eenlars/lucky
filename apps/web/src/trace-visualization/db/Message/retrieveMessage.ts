"use server"

import { createClient } from "@/lib/supabase/server"

export const retrieveMessages = async (workflowInvocationId: string) => {
  const supabase = await createClient()
  const { data, error: messagesError } = await supabase
    .from("Message")
    .select("*")
    .eq("wf_inv_id", workflowInvocationId)
    .order("created_at", { ascending: true })

  if (messagesError) {
    throw messagesError
  }

  return data
}
