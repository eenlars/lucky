import { supabase } from "@core/utils/clients/supabase/client"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get("limit") || "1000")
  const offset = parseInt(searchParams.get("offset") || "0")
  try {
    // First get all evolution runs
    const { data: evolutionRuns, error } = await supabase
      .from("EvolutionRun")
      .select(
        `
        run_id,
        goal_text,
        status,
        start_time,
        end_time,
        config,
        notes
      `
      )
      .order("start_time", { ascending: false })

    if (error) {
      console.error("Error fetching evolution runs:", error)
      return NextResponse.json(
        { error: "Failed to fetch evolution runs" },
        { status: 500 }
      )
    }

    if (!evolutionRuns || evolutionRuns.length === 0) {
      return NextResponse.json([])
    }

    // Get invocation counts for each run
    const runIds = evolutionRuns.map((run) => run.run_id)

    const { data: invocationCounts, error: countError } = await supabase
      .from("WorkflowInvocation")
      .select("run_id, status")
      .in("run_id", runIds)

    if (countError) {
      console.error("Error fetching invocation counts:", countError)
    }

    // Get generation counts for each run
    const { data: generations, error: genError } = await supabase
      .from("Generation")
      .select("run_id, number")
      .in("run_id", runIds)
      .order("number", { ascending: false })

    if (genError) {
      console.error("Error fetching generation counts:", genError)
    }

    // Group and count invocations per run
    const runCounts = new Map()

    evolutionRuns.forEach((run) => {
      runCounts.set(run.run_id, {
        run: { ...run },
        total: 0,
        successful: 0,
        generations: 0,
      })
    })

    if (invocationCounts) {
      invocationCounts.forEach((inv) => {
        if (runCounts.has(inv.run_id)) {
          runCounts.get(inv.run_id).total++
          if (inv.status === "completed") {
            runCounts.get(inv.run_id).successful++
          }
        }
      })
    }

    // Get max generation number for each run
    if (generations) {
      const maxGenerations = new Map()
      generations.forEach((gen) => {
        if (
          !maxGenerations.has(gen.run_id) ||
          gen.number > maxGenerations.get(gen.run_id)
        ) {
          maxGenerations.set(gen.run_id, gen.number)
        }
      })

      maxGenerations.forEach((maxGen, runId) => {
        if (runCounts.has(runId)) {
          runCounts.get(runId).generations = maxGen
        }
      })
    }

    // Filter to show only runs with meaningful data (at least some invocations or generations)
    const processedRuns = Array.from(runCounts.values())
      .map(({ run, total, successful, generations }) => ({
        ...run,
        config:
          typeof run.config === "string" ? JSON.parse(run.config) : run.config,
        duration: run.end_time
          ? new Date(run.end_time).getTime() -
            new Date(run.start_time).getTime()
          : null,
        total_invocations: total,
        successful_invocations: successful,
        generation_count: generations,
      }))
      .filter((run) => run.generation_count > 0)
      .sort(
        (a, b) =>
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      )

    // Apply pagination
    const paginatedRuns = processedRuns.slice(offset, offset + limit)

    return NextResponse.json(paginatedRuns)
  } catch (error) {
    console.error("Error in evolution-runs API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
