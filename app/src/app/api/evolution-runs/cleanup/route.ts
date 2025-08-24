import { supabase } from "@core/utils/clients/supabase/client"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    // Get all running evolution runs
    const { data: runningRuns, error: fetchError } = await supabase
      .from("EvolutionRun")
      .select("*")
      .eq("status", "running")

    if (fetchError) {
      console.error("Error fetching running runs:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!runningRuns || runningRuns.length === 0) {
      return NextResponse.json({ cleaned: 0 })
    }

    const now = Date.now()
    const staleRunIds: string[] = []

    // Check each running run to see if it's stale
    for (const run of runningRuns) {
      const startTime = new Date(run.start_time).getTime()
      const elapsedHours = (now - startTime) / (1000 * 60 * 60)

      // Consider stale if running for more than 5 hours
      if (elapsedHours > 5) {
        staleRunIds.push(run.run_id)
      }
    }

    if (staleRunIds.length === 0) {
      return NextResponse.json({ cleaned: 0 })
    }

    // Update stale runs to interrupted status
    const { error: updateError } = await supabase
      .from("EvolutionRun")
      .update({
        status: "interrupted",
        end_time: new Date().toISOString(),
        notes: "Automatically marked as interrupted due to being stale (>5 hours runtime)"
      })
      .in("run_id", staleRunIds)

    if (updateError) {
      console.error("Error updating stale runs:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log(`Cleaned up ${staleRunIds.length} stale evolution runs`)
    return NextResponse.json({ cleaned: staleRunIds.length, runIds: staleRunIds })
  } catch (error) {
    console.error("Error in cleanup:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}