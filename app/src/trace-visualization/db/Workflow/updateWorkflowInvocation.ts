import { supabase } from "@/core/utils/clients/supabase/client"
import { lgg } from "@/logger"

export interface InvocationScores {
  accuracy: number
  novelty: number
  fitness_score: number
}

export async function updateWorkflowInvocationScores(
  invocationId: string,
  scores: InvocationScores
): Promise<void> {
  try {
    const { error } = await supabase
      .from("WorkflowInvocation")
      .update({
        accuracy: scores.accuracy,
        novelty: scores.novelty,
        fitness_score: scores.fitness_score,
        updated_at: new Date().toISOString(),
      })
      .eq("wf_invocation_id", invocationId)

    if (error) {
      throw new Error(`Failed to update invocation scores: ${error.message}`)
    }

    lgg.info("Successfully updated invocation scores", {
      invocationId,
      scores,
    })
  } catch (error) {
    lgg.error("Error updating invocation scores:", error)
    throw error
  }
}
