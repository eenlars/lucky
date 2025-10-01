import { supabase } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

interface WorkflowInvocationSubset {
  wf_invocation_id: string
  wf_version_id: string
  start_time: string
  end_time: string | null
  status: "running" | "completed" | "failed" | "rolled_back"
  usd_cost: number
  fitness_score: number | null
  accuracy: number | null
  run_id: string | null
  generation_id: string | null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ run_id: string }> }) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const { run_id } = await params

  try {
    // First get all generations for this run
    const { data: generations, error: genError } = await supabase
      .from("Generation")
      .select("*")
      .eq("run_id", run_id)
      .order("number", { ascending: true })

    if (genError) {
      return NextResponse.json({ error: genError.message }, { status: 500 })
    }

    if (!generations || generations.length === 0) {
      return NextResponse.json([])
    }

    // Get workflow versions for these generations (WorkflowVersion has generation_id, not run_id)
    const generationIds = generations.map(g => g.generation_id)
    const { data: versions, error: versionError } = await supabase
      .from("WorkflowVersion")
      .select("*")
      .in("generation_id", generationIds)

    if (versionError) {
      return NextResponse.json({ error: versionError.message }, { status: 500 })
    }

    // Get all invocations for this run with selected fields
    const { data: invocations, error: invError } = await supabase
      .from("WorkflowInvocation")
      .select(
        `
        wf_invocation_id,
        wf_version_id,
        start_time,
        end_time,
        status,
        usd_cost,
        fitness_score,
        accuracy,
        run_id,
        generation_id
      `,
      )
      .eq("run_id", run_id)

    if (invError) {
      return NextResponse.json({ error: invError.message }, { status: 500 })
    }

    // Group data by generation
    const generationsWithData = generations.map(generation => {
      const genVersions = versions?.filter(v => v.generation_id === generation.generation_id) || []
      const genInvocations = invocations?.filter(i => i.generation_id === generation.generation_id) || []

      return {
        generation,
        versions: genVersions,
        invocations: genInvocations as WorkflowInvocationSubset[],
      }
    })

    return NextResponse.json(generationsWithData)
  } catch (error) {
    console.error("Error fetching generations data:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch generations data",
      },
      { status: 500 },
    )
  }
}
