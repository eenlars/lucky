/**
 * RunService - Database persistence and lifecycle management for evolution runs
 *
 * This service provides comprehensive database integration for the genetic programming
 * system, managing the complete lifecycle of evolution runs and generations:
 *
 * Core responsibilities:
 * - Creates and manages EvolutionRun database entries with configuration tracking
 * - Handles Generation creation, completion, and best genome tracking
 * - Provides evolution context (run ID, generation ID, numbers) to other components
 * - Implements robust retry logic for database operations with exponential backoff
 * - Supports run resumption from specific generations for long evolutions
 *
 * Database write protocol:
 * 1. Create EvolutionRun entry when evolution begins
 * 2. Create Generation entry for each generation start
 * 3. Update Generation with best genome on completion
 * 4. Update EvolutionRun with final status and timing on termination
 *
 * TODO: implement run checkpointing for disaster recovery
 * TODO: add run analytics and performance metrics tracking
 * TODO: implement run comparison and genealogy visualization support
 */

import type {
  EvolutionSettings,
  IterativeConfig,
} from "@core/improvement/gp/resources/evolution-types"
import type { EvolutionContext } from "@core/improvement/gp/resources/types"
import type { FlowEvolutionMode } from "@core/types"
import { supabase } from "@core/utils/clients/supabase/client"
import { isNir } from "@core/utils/common/isNir"
import { lgg } from "@core/utils/logging/Logger"
import type { Tables, TablesInsert, TablesUpdate } from "@lucky/shared"
import { JSONN } from "@lucky/shared"
import type { Genome } from "./Genome"
import type { PopulationStats } from "./resources/gp.types"

type WorkflowOperator = "init" | "crossover" | "mutation" | "immigrant"

export class RunService {
  // runservice is owner of the runId and currentGenerationId
  private runId?: string
  private currentGenerationId?: string
  private currentGenerationNumber = 0
  private verbose: boolean
  private evolutionMode: FlowEvolutionMode

  constructor(
    verbose = false,
    evolutionMode: FlowEvolutionMode = "GP",
    restartRunId?: string
  ) {
    this.verbose = verbose
    this.runId = restartRunId
    this.evolutionMode = evolutionMode
    // TODO: validate restartRunId exists in database if provided
    // TODO: initialize run metrics tracking
  }

  getEvolutionMode(): FlowEvolutionMode {
    return this.evolutionMode
  }

  private static async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries = 3,
    retryDelay = 1000
  ): Promise<T> {
    let lastError: any = null
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error: any) {
        lastError = error
        // Only retry on network/transient errors (not constraint violations or record-not-found)
        const _msg = error?.message || ""
        const code = error?.code || ""
        if (code === "23505" || code === "PGRST116") break // constraint or not found
        lgg.warn(
          `[RunService] ${context} failed (attempt ${attempt}/${maxRetries}):`,
          error
        )
        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * attempt)
          )
        }
      }
    }
    throw new Error(
      `[RunService] ${context} failed after ${maxRetries} attempts: ${lastError?.message}`
    )
  }

  getEvolutionContext(): EvolutionContext {
    return {
      runId: this.getRunId(),
      generationId: this.getCurrentGenerationId(),
      generationNumber: this.currentGenerationNumber,
    }
  }

  /**
   * Get current run ID
   */
  getRunId(): string {
    if (!this.runId) {
      throw new Error("No current run ID available")
    }
    return this.runId
  }

  /**
   * Get current generation ID
   */
  getCurrentGenerationId(): string {
    if (!this.currentGenerationId) {
      throw new Error("No current generation ID available")
    }
    return this.currentGenerationId
  }

  /**
   * Initialize a new evolution run in the database
   */
  async createRun(
    inputText: string,
    config: EvolutionSettings | IterativeConfig,
    continueRunId?: string
  ): Promise<void> {
    if (continueRunId) {
      const lastCompletedGeneration =
        await this.getLastCompletedGeneration(continueRunId)
      if (lastCompletedGeneration) {
        this.runId = lastCompletedGeneration.runId
        this.currentGenerationId = lastCompletedGeneration.generationId
        this.currentGenerationNumber = lastCompletedGeneration.generationNumber
        return
      } else {
        throw new Error(
          `[RunService] No last completed generation found for run: ${continueRunId}`
        )
      }
    }
    return RunService.withRetry(async () => {
      let notes = ""
      if (config.mode === "iterative") {
        notes = `Iterative Evolution Run - Iter: ${config.iterations}`
      } else {
        notes = `GP Evolution Run - Pop: ${config.populationSize}, Gen: ${config.generations}`
      }
      const runData: TablesInsert<"EvolutionRun"> = {
        goal_text: inputText,
        config: JSONN.show(config),
        status: "running",
        start_time: new Date().toISOString(),
        evolution_type: config.mode === "iterative" ? "iterative" : "gp",
        notes,
      }
      const { data, error } = await supabase
        .from("EvolutionRun")
        .insert(runData)
        .select("run_id")
        .single()
      if (error) {
        lgg.error("[RunService] Error creating evolution run:", error)
        throw error
      }
      const { generationId } = await RunService.saveGenerationDB({
        evolutionContext: {
          runId: data.run_id,
          generationNumber: 0,
        },
      })
      this.runId = data.run_id
      this.currentGenerationId = generationId
      if (this.verbose) {
        lgg.log(
          `[RunService] Initialized run ${this.runId} with generation ${this.currentGenerationId}`
        )
      }
    }, "createRun")
  }

  async createNewGeneration(): Promise<void> {
    const { generationId } = await RunService.saveGenerationDB({
      evolutionContext: {
        runId: this.getRunId(),
        generationNumber: this.currentGenerationNumber + 1,
      },
    })
    this.currentGenerationId = generationId
    this.currentGenerationNumber++
  }

  /**
   * Check if a generation already exists for the given run_id and number
   */
  async generationExists(generationNumber: number): Promise<boolean> {
    const activeRunId = this.runId
    if (!activeRunId) {
      throw new Error("No active run ID available for generation check")
    }
    return RunService.withRetry(async () => {
      const { data, error } = await supabase
        .from("Generation")
        .select("generation_id")
        .eq("run_id", activeRunId)
        .eq("number", generationNumber)
        .single()
      if (error) {
        if (error.code === "PGRST116") {
          lgg.warn(
            `[RunService] Generation ${generationNumber} does not exist for run ${activeRunId}`
          )
          return false
        }
        throw error
      }
      return !!data
    }, `generationExists(runId=${activeRunId}, number=${generationNumber})`)
  }

  /**
   * Get the generation ID for a specific run and generation number
   */
  async getGenerationIdByNumber(
    generationNumber: number,
    runId: string
  ): Promise<string | null> {
    return RunService.withRetry(async () => {
      const { data, error } = await supabase
        .from("Generation")
        .select("generation_id")
        .eq("run_id", runId)
        .eq("number", generationNumber)
        .single()
      if (error) {
        if (error.code === "PGRST116") {
          return null
        }
        throw error
      }
      return data.generation_id
    }, `getGenerationIdByNumber(runId=${runId}, number=${generationNumber})`)
  }

  /**
   * Create a new generation entry in the database
   */
  private static async saveGenerationDB({
    evolutionContext,
  }: {
    evolutionContext: Omit<EvolutionContext, "generationId">
  }): Promise<{ generationId: string }> {
    if (!evolutionContext.runId || isNir(evolutionContext.generationNumber)) {
      throw new Error("No active run ID available for generation creation")
    }
    return RunService.withRetry(async () => {
      const generationData: TablesInsert<"Generation"> = {
        number: evolutionContext.generationNumber,
        run_id: evolutionContext.runId,
        start_time: new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from("Generation")
        .insert(generationData)
        .select("generation_id")
        .single()
      if (error) {
        lgg.error("[RunService] Error creating generation:", JSONN.show(error))
        throw error
      }
      return {
        generationId: data.generation_id,
        generationNumber: evolutionContext.generationNumber,
      }
    }, `saveGenerationDB(runId=${evolutionContext.runId}, number=${evolutionContext.generationNumber})`)
  }

  /**
   * Check if WorkflowVersion exists in database
   */
  static async workflowVersionExists(
    workflowVersionId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("WorkflowVersion")
        .select("wf_version_id")
        .eq("wf_version_id", workflowVersionId)
        .single()

      if (error && error.code === "PGRST116") {
        // No record found
        return false
      }
      if (error) {
        throw error
      }
      return !!data
    } catch (error) {
      lgg.error(
        "[RunService] Failed to check WorkflowVersion existence:",
        error
      )
      return false
    }
  }

  /**
   * Create a WorkflowVersion entry for a genome in the main database (only if it doesn't exist)
   */
  static async ensureWorkflowVersion(
    genome: Genome,
    generationId: string,
    operator: WorkflowOperator = "mutation"
  ): Promise<string> {
    const workflowVersionId = genome.getWorkflowVersionId()

    // Check if WorkflowVersion already exists (for real genomes)
    const exists = await RunService.workflowVersionExists(workflowVersionId)
    if (exists) return workflowVersionId

    // Create WorkflowVersion for dummy genomes or missing entries
    try {
      const workflowConfig = genome.getWorkflowConfig()

      // Ensure main workflow exists
      const workflowInsertable = {
        wf_id: genome.getWorkflowId(),
        description: genome.getGoal(),
      }

      const { error: workflowError } = await supabase
        .from("Workflow")
        .upsert(workflowInsertable)

      if (workflowError)
        throw new Error(`Failed to upsert workflow: ${workflowError.message}`)

      // Create WorkflowVersion entry
      const workflowVersionInsertable: TablesInsert<"WorkflowVersion"> = {
        wf_version_id: workflowVersionId,
        workflow_id: genome.getWorkflowId(),
        commit_message: `GP Best Genome wf_version_id: ${workflowVersionId} (Gen ${generationId})`,
        dsl: JSONN.show(workflowConfig),
        iteration_budget: 10,
        time_budget_seconds: 3600,
        operation: operator,
        generation_id: generationId,
      }

      const { error: versionError } = await supabase
        .from("WorkflowVersion")
        .insert(workflowVersionInsertable)

      if (versionError)
        throw new Error(
          `Failed to insert workflow version: ${versionError.message}`
        )

      lgg.log(
        `[RunService] Created WorkflowVersion ${workflowVersionId} for genome ${genome.getWorkflowVersionId()}`
      )

      return workflowVersionId
    } catch (error) {
      lgg.error("[RunService] Failed to ensure workflow version:", error)
      throw error
    }
  }

  /**
   * Update generation with best workflow version ID and end time
   */
  async completeGeneration({
    bestGenome,
    stats,
    operator,
  }: {
    bestGenome: Genome
    stats?: PopulationStats
    operator: WorkflowOperator
  }): Promise<void> {
    const activeRunId = this.runId
    const activeGenerationId = this.currentGenerationId
    if (!activeGenerationId || !activeRunId) {
      lgg.warn("[RunService] No active generation ID or run ID for completion")
      return
    }
    await RunService.withRetry(async () => {
      const workflowVersionId = await RunService.ensureWorkflowVersion(
        bestGenome,
        activeGenerationId,
        operator
      )
      const genomeFeedback = bestGenome.getFeedback()
      lgg.log(
        "[RunService] Best genome feedback before saving:",
        genomeFeedback
      )
      const updateData: TablesUpdate<"Generation"> = {
        end_time: new Date().toISOString(),
        best_workflow_version_id: workflowVersionId,
        comment: stats
          ? `Best: ${stats.bestFitness.toFixed(3)}, Avg: ${stats.avgFitness.toFixed(3)}, Cost: $${stats.evaluationCost.toFixed(2)}`
          : `Best genome: ${bestGenome.getWorkflowVersionId()}`,
        feedback: genomeFeedback ?? undefined,
      }
      const { error } = await supabase
        .from("Generation")
        .update(updateData)
        .eq("generation_id", activeGenerationId)
      if (error) {
        lgg.error("[RunService] Error completing generation:", error)
        throw error
      }
      lgg.log(
        `[RunService] Completed generation: ${activeGenerationId} with best workflow version: ${workflowVersionId}`
      )
    }, `completeGeneration(generationId=${activeGenerationId}, operator=${operator})`)
  }

  /**
   * Update evolution run status and end time
   */
  async completeRun(
    status: Tables<"EvolutionRun">["status"],
    totalCost?: number,
    bestGenome?: Genome
  ): Promise<void> {
    const activeRunId = this.runId
    if (!activeRunId) {
      lgg.warn("[RunService] No active run ID for completion")
      return
    }

    try {
      const notes = bestGenome
        ? `Completed with best genome: ${bestGenome.getWorkflowVersionId()}, fitness: ${bestGenome.getFitness()?.score.toFixed(3)}` +
          (totalCost ? `, total cost: $${totalCost.toFixed(2)}` : "")
        : totalCost
          ? `Total cost: $${totalCost.toFixed(2)}`
          : "Evolution run completed"

      const updateData: TablesUpdate<"EvolutionRun"> = {
        status,
        end_time: new Date().toISOString(),
        notes,
      }

      const { error } = await supabase
        .from("EvolutionRun")
        .update(updateData)
        .eq("run_id", activeRunId)

      if (error) {
        lgg.error("[RunService] Error completing evolution run:", error)
        throw error
      }

      lgg.log(
        `[RunService] Completed evolution run: ${activeRunId} with status: ${status}`
      )
    } catch (error) {
      lgg.error("[RunService] Failed to complete evolution run:", error)
      throw error
    }
  }

  /**
   * Get current generation ID
   */
  getGenerationId(): string | undefined {
    return this.currentGenerationId
  }

  /**
   * Get the last completed generation number for a given run
   * Returns null if no completed generations exist
   */
  async getLastCompletedGeneration(
    runId: string
  ): Promise<EvolutionContext | null> {
    if (!runId) {
      lgg.warn(
        "[RunService] No active run ID available for last completed generation lookup"
      )
      return null
    }

    try {
      const { data, error } = await supabase
        .from("Generation")
        .select("number, generation_id")
        .eq("run_id", runId)
        .not("end_time", "is", null) // Only completed generations (have end_time)
        .order("number", { ascending: false })
        .limit(1)
        .single()

      if (error) {
        // If no record found, return null
        if (error.code === "PGRST116") {
          return null
        }
        lgg.error(
          "[RunService] Error getting last completed generation:",
          JSONN.show(error)
        )
        throw error
      }

      if (!data?.number || !data?.generation_id) {
        lgg.warn(
          "[RunService] No last completed generation found for run:",
          runId
        )
        return null
      }

      return {
        runId,
        generationNumber: data.number,
        generationId: data.generation_id,
      }
    } catch (error) {
      lgg.error(
        "[RunService] Failed to get last completed generation:",
        JSONN.show(error)
      )
      throw error
    }
  }
}
