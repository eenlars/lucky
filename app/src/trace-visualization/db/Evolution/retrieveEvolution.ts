"use server"
import { supabase } from "@core/utils/clients/supabase/client"
import type { Tables } from "@lucky/shared"

export interface WorkflowInvocationSubset {
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

export interface GenerationWithData {
  generation: Tables<"Generation">
  versions: Tables<"WorkflowVersion">[]
  invocations: WorkflowInvocationSubset[]
}

interface CacheEntry {
  data: Promise<GenerationWithData[]>
  timestamp: number
  runStatus: string
}

const evolutionRunCache = new Map<string, CacheEntry>()

const shouldUseCache = (run: Tables<"EvolutionRun">) => {
  const runAge = Date.now() - new Date(run.start_time).getTime()
  const oneHourMs = 60 * 60 * 1000

  return runAge > oneHourMs && run.status !== "running"
}

const isCacheValid = (cacheEntry: CacheEntry): boolean => {
  const now = Date.now()
  const cacheMaxAge = 24 * 60 * 60 * 1000 // 24 hours

  return now - cacheEntry.timestamp < cacheMaxAge
}

const cleanupCache = () => {
  const now = Date.now()
  const cacheMaxAge = 24 * 60 * 60 * 1000 // 24 hours

  for (const [key, entry] of evolutionRunCache.entries()) {
    if (now - entry.timestamp > cacheMaxAge) {
      evolutionRunCache.delete(key)
    }
  }

  if (evolutionRunCache.size > 100) {
    const entries = Array.from(evolutionRunCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

    const toDelete = entries.slice(0, entries.length - 50)
    toDelete.forEach(([key]) => evolutionRunCache.delete(key))
  }
}

export const retrieveEvolutionRuns = async (limit = 15, offset = 0) => {
  const { data, error } = await supabase
    .from("EvolutionRun")
    .select("*")
    .order("start_time", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  return data || []
}

export const retrieveEvolutionRun = async (runId: string) => {
  const { data, error } = await supabase
    .from("EvolutionRun")
    .select("*")
    .eq("run_id", runId)
    .single()

  if (error) throw error

  return data
}

export const retrieveGenerationsByRun = async (runId: string) => {
  const { data, error } = await supabase
    .from("Generation")
    .select("*")
    .eq("run_id", runId)
    .order("number", { ascending: true })

  if (error) throw error

  return data
}

const performComplexQuery = async (
  runId: string
): Promise<GenerationWithData[]> => {
  // Use the same pattern as the working API route - deep join with foreign key constraints
  const { data: generations, error: generationsError } = await supabase
    .from("Generation")
    .select(
      `
      generation_id,
      number,
      comment,
      feedback,
      start_time,
      end_time,
      run_id,
      best_workflow_version_id,
      workflow_invocations:WorkflowInvocation!fk_wfi_generation (
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
      )
    `
    )
    .eq("run_id", runId)
    .order("number", { ascending: true })

  if (generationsError) {
    throw generationsError
  }

  // Get workflow versions for this run by filtering on generation_id
  // First collect all generation IDs from this run
  const generationIds = generations?.map((g) => g.generation_id) || []

  const { data: workflowVersions, error: wfVersionError } = await supabase
    .from("WorkflowVersion")
    .select("*")
    .not("generation_id", "is", null)
    .in("generation_id", generationIds)

  if (wfVersionError) {
    throw wfVersionError
  }

  // Map the data to the expected format
  const generationsWithData =
    generations?.map((generation) => {
      // Find workflow versions for this generation
      const generationVersions =
        workflowVersions?.filter(
          (wv) => wv.generation_id === generation.generation_id
        ) || []

      return {
        generation: {
          generation_id: generation.generation_id,
          number: generation.number,
          comment: generation.comment,
          feedback: generation.feedback,
          start_time: generation.start_time,
          end_time: generation.end_time,
          run_id: generation.run_id,
          best_workflow_version_id: generation.best_workflow_version_id,
        },
        versions: generationVersions,
        invocations: generation.workflow_invocations || [],
      }
    }) || []

  return generationsWithData
}

export const retrieveAllInvocationsForRunGroupedByGeneration = async (
  runId: string
) => {
  // Run periodic cache cleanup
  cleanupCache()

  // First get the run to check its status and age
  const run = await retrieveEvolutionRun(runId)

  if (shouldUseCache(run)) {
    const cached = evolutionRunCache.get(runId)
    if (cached && isCacheValid(cached) && cached.runStatus === run.status) {
      console.log(`[Evolution Cache] Using cached data for run ${runId}`)
      return cached.data
    } else {
      console.log(
        `[Evolution Cache] Cache miss or status change for run ${runId}`
      )
    }
  }

  // Execute the expensive query
  const dataPromise = performComplexQuery(runId)

  // Cache if appropriate
  if (shouldUseCache(run)) {
    evolutionRunCache.set(runId, {
      data: dataPromise,
      timestamp: Date.now(),
      runStatus: run.status,
    })
  }

  return dataPromise
}

export const retrieveInvocationsByGeneration = async (generation: string) => {
  const { data, error } = await supabase
    .from("WorkflowInvocation")
    .select("*")
    .eq("generation_id", generation)
    .order("start_time", { ascending: false })

  if (error) throw error

  return data
}

export const retrieveInvocationsByRun = async (runId: string) => {
  const { data, error } = await supabase
    .from("WorkflowInvocation")
    .select("*")
    .eq("run_id", runId)
    .order("start_time", { ascending: false })

  if (error) throw error

  return data
}

/**
 * Mark stale evolution runs as interrupted
 * A run is considered stale if it's been running for more than 26 hours (2 hours past the 24h limit)
 */
export const cleanupStaleEvolutionRuns = async () => {
  const staleThresholdHours = 6
  const staleThresholdMs = staleThresholdHours * 60 * 60 * 1000
  const cutoffTime = new Date(Date.now() - staleThresholdMs).toISOString()

  const { data, error } = await supabase
    .from("EvolutionRun")
    .update({
      status: "interrupted",
      end_time: new Date().toISOString(),
      notes: `Marked as interrupted due to stale state (running > ${staleThresholdHours}h)`,
    })
    .eq("status", "running")
    .lt("start_time", cutoffTime)
    .select("run_id")

  if (error) throw error

  return data
}
