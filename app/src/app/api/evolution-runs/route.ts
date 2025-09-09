import { supabase } from "@core/utils/clients/supabase/client"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get("limit") || "1000")
  const offset = parseInt(searchParams.get("offset") || "0")

  // filter parameters
  const statusFilter = searchParams.get("status") || "all"
  const modeFilter = searchParams.get("mode") || "all"
  const searchTerm = searchParams.get("search") || ""
  const dateFilter = searchParams.get("dateFilter") || "all"
  const hideEmpty = searchParams.get("hideEmpty") === "true"

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
        evolution_type,
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

    // Get generations for each run (need ids and numbers)
    const { data: generations, error: genError } = await supabase
      .from("Generation")
      .select("run_id, generation_id, number")
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

    // Compute min/max generation number per run and a lookup for generation number by id
    const minGenByRun = new Map<string, number>()
    const maxGenByRun = new Map<string, number>()
    const genCountsByRun = new Map<string, number>()
    const genNumberById = new Map<string, number>()
    if (generations) {
      generations.forEach((gen: any) => {
        genNumberById.set(gen.generation_id, gen.number)
        const currentMin = minGenByRun.get(gen.run_id)
        const currentMax = maxGenByRun.get(gen.run_id)
        if (currentMin == null || gen.number < currentMin) {
          minGenByRun.set(gen.run_id, gen.number)
        }
        if (currentMax == null || gen.number > currentMax) {
          maxGenByRun.set(gen.run_id, gen.number)
        }
        // track unique generation numbers per run to compute count accurately
        genCountsByRun.set(
          gen.run_id,
          (genCountsByRun.get(gen.run_id) || 0) + 1
        )
      })

      // Ensure we represent generation_count as a count, not the max index
      maxGenByRun.forEach((maxGen, runId) => {
        if (runCounts.has(runId)) {
          // Prefer explicit counts if available; otherwise fallback to maxGen + 1
          const explicitCount = genCountsByRun.get(runId)
          runCounts.get(runId).generations =
            explicitCount != null ? explicitCount : maxGen + 1
        }
      })
    }

    // Fetch accuracies grouped by run/generation
    const { data: accuracies, error: accError } = await supabase
      .from("WorkflowInvocation")
      .select("run_id, generation_id, accuracy")
      .in("run_id", runIds)

    if (accError) {
      console.error("Error fetching accuracies:", accError)
    }

    // Build per-run averages for first and last generation
    const perRunAccuracies = new Map<string, Map<number, number[]>>()
    if (accuracies) {
      for (const row of accuracies as any[]) {
        const genNum = genNumberById.get(row.generation_id)
        if (genNum == null) continue
        let byGen = perRunAccuracies.get(row.run_id)
        if (!byGen) {
          byGen = new Map<number, number[]>()
          perRunAccuracies.set(row.run_id, byGen)
        }
        const arr = byGen.get(genNum) ?? []
        const val = typeof row.accuracy === "number" ? row.accuracy : 0
        arr.push(val)
        byGen.set(genNum, arr)
      }
    }

    // Filter to show only runs with meaningful data (at least some invocations or generations)
    const processedRuns = Array.from(runCounts.values())
      .map(({ run, total, successful, generations }) => {
        const byGen = perRunAccuracies.get(run.run_id)
        const minNum = minGenByRun.get(run.run_id)
        const maxNum = maxGenByRun.get(run.run_id)
        let avgDelta: number | null = null
        if (byGen && minNum != null && maxNum != null && maxNum !== minNum) {
          const first = byGen.get(minNum) || []
          const last = byGen.get(maxNum) || []
          if (first.length > 0 && last.length > 0) {
            const avgFirst = first.reduce((a, b) => a + b, 0) / first.length
            const avgLast = last.reduce((a, b) => a + b, 0) / last.length
            avgDelta = Number((avgLast - avgFirst).toFixed(2))
          }
        }

        return {
          ...run,
          config:
            typeof run.config === "string"
              ? JSON.parse(run.config)
              : run.config,
          duration: run.end_time
            ? new Date(run.end_time).getTime() -
              new Date(run.start_time).getTime()
            : null,
          total_invocations: total,
          successful_invocations: successful,
          generation_count: generations,
          avg_accuracy_delta: avgDelta,
        }
      })
      .filter((run) => {
        // include runs even with 0 generations (e.g., just created)

        // hide empty runs filter
        if (hideEmpty) {
          const hasInvocations =
            !!run.total_invocations && run.total_invocations > 0
          const hasGenerations = (run.generation_count ?? 0) > 0
          if (!hasInvocations && !hasGenerations) return false
        }

        // search filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase()
          if (
            !run.goal_text.toLowerCase().includes(searchLower) &&
            !run.run_id.toLowerCase().includes(searchLower)
          ) {
            return false
          }
        }

        // status filter
        if (statusFilter !== "all" && run.status !== statusFilter) {
          return false
        }

        // evolution type filter (mode param carries evolution_type)
        if (modeFilter !== "all") {
          const normalized = modeFilter.toLowerCase()
          if (run.evolution_type?.toLowerCase() !== normalized) return false
        }

        // date filter
        if (dateFilter !== "all") {
          const runDate = new Date(run.start_time)
          const now = new Date()
          const daysDiff =
            (now.getTime() - runDate.getTime()) / (1000 * 60 * 60 * 24)

          switch (dateFilter) {
            case "today":
              if (daysDiff > 1) return false
              break
            case "week":
              if (daysDiff > 7) return false
              break
            case "month":
              if (daysDiff > 30) return false
              break
          }
        }

        return true
      })
      .sort(
        (a, b) =>
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      )

    // Apply pagination
    const paginatedRuns = processedRuns.slice(offset, offset + limit)

    return NextResponse.json(paginatedRuns, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Error in evolution-runs API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
