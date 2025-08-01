"use server"
import { supabase } from "@/core/utils/clients/supabase/client"

export const retrieveMessages = async (workflowInvocationId: string) => {
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
