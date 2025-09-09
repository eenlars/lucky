import { createEvolutionVisualizationData } from "@/lib/evolution-utils"
import { traceWorkflowEvolution } from "@/results/workflow-evolution-tracer"
import { supabase } from "@core/utils/clients/supabase/client"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ run_id: string }> }
) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { run_id: runId } = await params

    // First, try to find successful invocations from this evolution run
    const { data: successfulInvocations, error: successError } = await supabase
      .from("WorkflowInvocation")
      .select("wf_invocation_id, accuracy, fitness_score, status")
      .eq("run_id", runId)
      .eq("status", "completed")
      .order("fitness_score", { ascending: false, nullsFirst: false })
      .limit(1)

    if (successError) {
      console.error("Error fetching successful invocations:", successError)
      return NextResponse.json(
        { error: "Failed to fetch workflow invocations" },
        { status: 500 }
      )
    }

    let bestInvocation
    if (successfulInvocations && successfulInvocations.length > 0) {
      // Use the best successful invocation
      bestInvocation = successfulInvocations[0]
    } else {
      // No successful invocations, try to find any invocation (including failed ones)
      const { data: anyInvocations, error: anyError } = await supabase
        .from("WorkflowInvocation")
        .select("wf_invocation_id, accuracy, fitness_score, status")
        .eq("run_id", runId)
        .order("start_time", { ascending: false })
        .limit(1)

      if (anyError) {
        console.error("Error fetching any invocations:", anyError)
        return NextResponse.json(
          { error: "Failed to fetch workflow invocations" },
          { status: 500 }
        )
      }

      if (!anyInvocations || anyInvocations.length === 0) {
        return NextResponse.json(
          { error: "No invocations found for this evolution run" },
          { status: 404 }
        )
      }

      bestInvocation = anyInvocations[0]
    }

    // Trace the evolution from this invocation
    const graph = await traceWorkflowEvolution(bestInvocation.wf_invocation_id)

    if (!graph) {
      return NextResponse.json(
        { error: "Failed to trace workflow evolution" },
        { status: 500 }
      )
    }

    const visualization = createEvolutionVisualizationData(graph)

    return NextResponse.json({
      graph,
      visualization,
      entryInvocation: bestInvocation,
    })
  } catch (error) {
    console.error("Error in evolution trace API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
