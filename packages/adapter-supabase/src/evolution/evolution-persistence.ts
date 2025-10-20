/**
 * Evolution persistence for Supabase.
 * Handles run and generation tracking.
 */

import type { TablesInsert, TablesUpdate } from "@lucky/shared/types/supabase.types"
import type { SupabaseClient } from "@supabase/supabase-js"
import { PersistenceError } from "../errors/domain-errors"
import type { EvolutionContext, IEvolutionPersistence, PopulationStats } from "../persistence-interface"

export class SupabaseEvolutionPersistence implements IEvolutionPersistence {
  constructor(private client: SupabaseClient) {}

  async createRun(data: TablesInsert<"EvolutionRun">, clerkId?: string): Promise<string> {
    const runData: TablesInsert<"EvolutionRun"> = {
      ...data,
      run_id: data.run_id || undefined,
      start_time: data.start_time || new Date().toISOString(),
      clerk_id: clerkId || data.clerk_id || undefined,
    }

    const { data: result, error } = await this.client.from("EvolutionRun").insert(runData).select("run_id").single()

    if (error) {
      throw new PersistenceError(`Failed to create evolution run: ${error.message}`, error)
    }
    return result.run_id
  }

  async completeRun(runId: string, status: string, notes?: string): Promise<void> {
    const updateData = {
      status,
      end_time: new Date().toISOString(),
      notes,
    }

    const { error } = await this.client.from("EvolutionRun").update(updateData).eq("run_id", runId)

    if (error) {
      throw new PersistenceError(`Failed to complete evolution run: ${error.message}`, error)
    }
  }

  async createGeneration(data: TablesInsert<"Generation">): Promise<string> {
    const generationData: TablesInsert<"Generation"> = {
      ...data,
      generation_id: data.generation_id || undefined,
      start_time: data.start_time || new Date().toISOString(),
    }

    const { data: result, error } = await this.client
      .from("Generation")
      .insert(generationData)
      .select("generation_id")
      .single()

    if (error) {
      throw new PersistenceError(`Failed to create generation: ${error.message}`, error)
    }
    return result.generation_id
  }

  async completeGeneration(update: TablesUpdate<"Generation">, stats?: PopulationStats): Promise<void> {
    const updateData: TablesUpdate<"Generation"> = {
      ...update,
      end_time: update.end_time || new Date().toISOString(),
      comment: stats
        ? `Best: ${stats.bestFitness.toFixed(3)}, Avg: ${stats.avgFitness.toFixed(3)}, Cost: $${stats.evaluationCost.toFixed(2)}`
        : update.comment,
    }

    const generationId = update.generation_id
    if (!generationId) {
      throw new PersistenceError("generation_id is required for completeGeneration")
    }

    const { error } = await this.client.from("Generation").update(updateData).eq("generation_id", generationId)

    if (error) {
      throw new PersistenceError(`Failed to complete generation: ${error.message}`, error)
    }
  }

  async generationExists(runId: string, generationNumber: number): Promise<boolean> {
    const { data, error } = await this.client
      .from("Generation")
      .select("generation_id")
      .eq("run_id", runId)
      .eq("number", generationNumber)
      .maybeSingle()

    if (error) {
      throw new PersistenceError(`Failed to check generation existence: ${error.message}`, error)
    }
    return !!data
  }

  async getGenerationIdByNumber(runId: string, generationNumber: number): Promise<string | null> {
    const { data, error } = await this.client
      .from("Generation")
      .select("generation_id")
      .eq("run_id", runId)
      .eq("number", generationNumber)
      .maybeSingle()

    if (error) {
      throw new PersistenceError(`Failed to get generation ID: ${error.message}`, error)
    }
    return data?.generation_id || null
  }

  async getLastCompletedGeneration(runId: string): Promise<EvolutionContext | null> {
    const { data, error } = await this.client
      .from("Generation")
      .select("number, generation_id")
      .eq("run_id", runId)
      .not("end_time", "is", null)
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new PersistenceError(`Failed to get last completed generation: ${error.message}`, error)
    }

    if (!data?.number || !data?.generation_id) return null

    return {
      runId,
      generationNumber: data.number,
      generationId: data.generation_id,
    }
  }
}
