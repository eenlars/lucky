import { ENV_CONFIG } from "@core/core-config/constants"
import { getCoreConfig, isLoggingEnabled } from "@core/core-config/coreConfig"
import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import { improveNodesIterativelyImpl } from "@core/improvement/behavioral/judge/mainImprovement"
import { type PrepareProblemMethod, prepareProblem } from "@core/improvement/behavioral/prepare/workflow/prepareMain"
import type { EvolutionContext } from "@core/improvement/gp/rsc/gp.types"
import { WorkFlowNode } from "@core/node/WorkFlowNode"
import { WorkflowFitnessError } from "@core/utils/errors/workflow-errors"
import { lgg } from "@core/utils/logging/Logger"
import { persistWorkflow } from "@core/utils/persistence/file/resultPersistence"
import { type ContextStore, createContextStore } from "@core/utils/persistence/memory/ContextStore"
import type { WorkflowFile } from "@lucky/shared"

import { verifyWorkflowConfig, verifyWorkflowConfigStrict } from "@core/utils/validation/workflow/verifyWorkflow"
// zodToJson no longer needed - outputSchema is JSON Schema, not Zod
// import { zodToJson } from "@core/utils/validation/zodToJson"
import { formalizeWorkflow } from "@core/workflow/actions/generate/formalizeWorkflow"
import { type SimplifyOptions, workflowToString } from "@core/workflow/actions/generate/workflowToString"
import type { EvaluationInput, WorkflowIO } from "@core/workflow/ingestion/ingestion.types"
import { aggregateResults, evaluateRuns, runAllIO } from "@core/workflow/runner/runAllInputs"
import type { AggregateEvaluationResult, RunResult } from "@core/workflow/runner/types"
import { ensure, guard, throwIf } from "@core/workflow/schema/errorMessages"
import { hashWorkflow } from "@core/workflow/schema/hash"
import type { WorkflowConfig, WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import type { RS, WorkflowEventHandler } from "@lucky/shared"
import { R, genShortId, isNir } from "@lucky/shared"
import type { ToolExecutionContext } from "@lucky/tools"
import { INACTIVE_TOOLS } from "@lucky/tools"
// src/core/workflow/Workflow.ts
import type { IPersistence } from "@together/adapter-supabase"
import { generateWorkflowIdea } from "./actions/generate/generateIdea"

type GenomeFeedback = string | null
/**
 * Workflow verifies, registers, instantiates and orchestrates execution.
 */
export class Workflow {
  private readonly config: WorkflowConfig
  private readonly workflowId: string
  private readonly workflowVersionId: string
  private parent1Id?: string
  private parent2Id?: string
  private readonly nodeMap = new Map<string, WorkFlowNode>()
  public readonly nodes: WorkFlowNode[] = []
  private workflowInvocationIds = new Map<number, string>()
  private workflowIO: WorkflowIO[]
  private mainGoal: string
  private totalCost: number
  private contextStores = new Map<string, ContextStore>()
  private workflowFiles = new Set<WorkflowFile>()
  public evolutionContext?: EvolutionContext
  private evaluationInput: EvaluationInput //todo-evaluationInput possibly remove this.
  private toolContext?: Partial<ToolExecutionContext> // partial, since the workflowInvocationId is set later
  protected feedback: GenomeFeedback = null
  protected fitness?: FitnessOfWorkflow
  private runResults?: RunResult[]
  private evaluated = false
  private hasRun = false
  private problemAnalysis: string | undefined
  private persistence?: IPersistence

  protected constructor(
    config: WorkflowConfig,
    evaluationInput: EvaluationInput,
    evolutionContext?: EvolutionContext,
    toolContext?: Partial<ToolExecutionContext> | undefined,
    workflowVersionId?: string,
    persistence?: IPersistence,
  ) {
    this.config = config
    this.workflowId = evaluationInput.workflowId
    // Use provided ID or generate hash-based ID
    if (workflowVersionId) {
      this.workflowVersionId = workflowVersionId
    } else {
      const fullHash = hashWorkflow(config)
      this.workflowVersionId = `wf_ver_${fullHash.substring(0, 8)}`
    }
    this.mainGoal = evaluationInput.goal
    this.verifyCriticalIssues(config)
    this.workflowInvocationIds = new Map<number, string>()
    this.workflowIO = [] // will be set later via prepareWorkflow
    this.totalCost = 0
    this.evolutionContext = evolutionContext
    this.evaluationInput = evaluationInput
    this.toolContext = toolContext
    this.problemAnalysis = undefined
    this.persistence = persistence
  }

  private verifyCriticalIssues(config: WorkflowConfig): void {
    const inactiveToolsUsed: string[] = []

    for (const node of config.nodes) {
      const allNodeTools = [...(node.codeTools || []), ...(node.mcpTools || [])]

      for (const tool of allNodeTools) {
        // TODO: this must be dynamic.
        if (INACTIVE_TOOLS.includes(tool)) {
          inactiveToolsUsed.push(`node "${node.nodeId}" uses inactive tool "${tool}"`)
        }
      }
    }

    if (inactiveToolsUsed.length > 0) {
      lgg.error("🚨 Workflow verification failed - inactive tools detected:")
      inactiveToolsUsed.forEach(error => lgg.error(`- ${error}`))
    }
  }

  public static create({
    config,
    evaluationInput,
    parent1Id,
    parent2Id,
    evolutionContext,
    toolContext,
    workflowVersionId,
    persistence,
  }: {
    config: WorkflowConfig
    evaluationInput: EvaluationInput
    parent1Id?: string
    parent2Id?: string
    evolutionContext?: EvolutionContext
    toolContext: Partial<ToolExecutionContext> | undefined
    workflowVersionId?: string
    persistence?: IPersistence
  }): Workflow {
    const wf = new Workflow(
      config,
      evaluationInput,
      evolutionContext,
      toolContext ?? undefined,
      workflowVersionId,
      persistence,
    )
    wf.parent1Id = parent1Id
    wf.parent2Id = parent2Id
    return wf
  }

  public getConfig(): WorkflowConfig {
    return this.config
  }

  public getPersistence(): IPersistence | undefined {
    return this.persistence
  }

  public async prepareWorkflow(
    evaluationInput: EvaluationInput,
    problemAnalysisMethod: PrepareProblemMethod,
  ): Promise<void> {
    const { newGoal, workflowIO, problemAnalysis } = await prepareProblem(evaluationInput, problemAnalysisMethod)

    this.workflowIO = workflowIO
    this.mainGoal = newGoal
    this.problemAnalysis = problemAnalysis

    // Update the WorkflowVersion with all WorkflowIO data (if persistence enabled)
    if (!isNir(this.workflowIO)) {
      if (this.persistence) {
        await this.persistence.updateWorkflowVersionWithIO(this.workflowVersionId, this.workflowIO)
      }
    } else {
      lgg.warn("No workflow IO to update.. skipping")
      lgg.warn("might be a problem if you are going to evaluate.")
    }
  }

  /**
   * Set pre-computed workflow IO and goals directly (for GP optimization)
   * Avoids re-calling prepareProblem when data is already available
   */
  public setPrecomputedWorkflowData({
    workflowIO,
    newGoal,
    problemAnalysis,
  }: {
    workflowIO: WorkflowIO[]
    newGoal: string
    problemAnalysis: string
  }): void {
    this.workflowIO = workflowIO
    this.mainGoal = newGoal
    this.problemAnalysis = problemAnalysis
  }

  public getWorkflowVersionId(): string {
    return this.workflowVersionId
  }

  getWorkflowIO(): WorkflowIO[] {
    return this.workflowIO
  }

  getTotalCost(): number {
    return this.totalCost
  }

  toConfig(): WorkflowConfig {
    return this.config
  }

  getEvaluationInput(): EvaluationInput {
    return this.evaluationInput
  }

  /**
   * Gets the fitness score for this workflow.
   * Note: Fitness data should be cleared between evaluation phases to prevent data leakage.
   *
   * @returns The fitness score
   * @throws {WorkflowFitnessError} If fitness has not been calculated
   */
  getFitness(): FitnessOfWorkflow | undefined {
    if (!this.fitness)
      throw new WorkflowFitnessError("Fitness data has not been calculated for this workflow yet.", {
        workflowId: this.workflowId,
        workflowVersionId: this.workflowVersionId,
      })
    return this.fitness
  }

  /**
   * Gets the numeric fitness score.
   *
   * @returns The numeric fitness score
   * @throws {WorkflowFitnessError} If fitness has not been calculated
   */
  getFitnessScore(): number {
    if (!this.fitness)
      throw new WorkflowFitnessError("Fitness score is not available. Workflow must be evaluated first.", {
        workflowId: this.workflowId,
        workflowVersionId: this.workflowVersionId,
      })
    return this.fitness.score
  }

  /**
   * Gets the feedback for this workflow.
   * Note: Feedback data should be cleared between evaluation phases to prevent data leakage.
   *
   * @returns The feedback string or null
   */
  getFeedback(): GenomeFeedback {
    return this.feedback
  }

  /**
   * Clears evaluation state to prevent data leakage between phases.
   * Should be called before improvement operations to ensure isolation.
   */
  clearEvaluationState(): void {
    this.fitness = undefined
    this.feedback = null
  }

  /**
   * Gets the URL for the workflow trace viewer.
   *
   * @param invocationId - Optional invocation ID to link to specific run
   * @returns URL to the trace viewer
   */
  getLink(invocationId?: string): string {
    const baseUrl = ENV_CONFIG.TRACE_BASE_URL
    if (invocationId) {
      return `${baseUrl}/${invocationId}`
    }
    return baseUrl
  }

  /**
   * Runs workflow with starting prompt and evaluates.
   * @returns aggregated evaluation result
   */
  async runAndEvaluate(): Promise<RS<AggregateEvaluationResult>> {
    lgg.log(`[Workflow.runAndEvaluate] Starting run phase for ${this.getWorkflowVersionId()}`)
    const { error } = await this.run()
    if (error) {
      lgg.error(`[Workflow.runAndEvaluate] Run phase failed for ${this.getWorkflowVersionId()}: ${error}`)
      return R.error(error, 0)
    }
    lgg.log(`[Workflow.runAndEvaluate] Run phase succeeded for ${this.getWorkflowVersionId()}, starting evaluate phase`)
    const result = await this.evaluate()
    if (result.success) {
      lgg.log(`[Workflow.runAndEvaluate] Evaluate phase succeeded for ${this.getWorkflowVersionId()}`)
    } else {
      lgg.error(`[Workflow.runAndEvaluate] Evaluate phase failed for ${this.getWorkflowVersionId()}: ${result.error}`)
    }
    return result
  }

  /**
   * Executes the workflow for all IO without evaluation.
   * @param options - Optional parameters for workflow execution
   * @param options.onProgress - Optional progress event handler for receiving workflow events
   * @param options.abortSignal - Optional abort signal for graceful cancellation
   * @returns array of run results for each IO
   */
  async run(options?: { onProgress?: WorkflowEventHandler; abortSignal?: AbortSignal }): Promise<RS<RunResult[]>> {
    throwIf(this.evaluated, "Workflow has already been evaluated")
    throwIf(this.hasRun, "Workflow has already been run")

    lgg.log(`[Workflow.run] Starting setup for ${this.getWorkflowVersionId()}`)
    await this.setup()

    lgg.log(`[Workflow.run] Setup complete, starting runAllIO for ${this.getWorkflowVersionId()}`)
    const { data: runResults, error } = await runAllIO(this, options)
    this.hasRun = true
    if (error) {
      lgg.error(`[Workflow.run] runAllIO failed for ${this.getWorkflowVersionId()}: ${error}`)
      return R.error(error, 0)
    }
    lgg.log(
      `[Workflow.run] runAllIO succeeded for ${this.getWorkflowVersionId()}, got ${runResults?.length || 0} results`,
    )
    this.runResults = runResults
    return R.success(runResults ?? [], 0)
  }

  /**
   * Evaluates given run results against expected outputs.
   * @param runResults Results from a previous run()
   * @returns aggregated evaluation result
   */
  async evaluate(): Promise<RS<AggregateEvaluationResult>> {
    if (!this.runResults) {
      return R.error("Run results not found", 0)
    }
    throwIf(this.evaluated, "Workflow has already been evaluated")
    const evals = await evaluateRuns(this, this.runResults)
    const { data, usdCost, error } = await aggregateResults(evals)
    this.evaluated = true
    guard(data, `evaluate failed: ${JSON.stringify(error)}`)
    this.fitness = data.averageFitness
    this.totalCost += usdCost ?? 0
    this.feedback = data.averageFeedback
    lgg.log("[Workflow] Setting feedback:", data.averageFeedback)
    return R.success(data, usdCost)
  }

  /**
   * Verifies workflow, registers in DB, instantiates nodes.
   */
  protected async setup(strict = false): Promise<void> {
    // check if io is set
    guard(this.workflowIO, "Workflow IO is not set")

    if (strict) await verifyWorkflowConfigStrict(this.config)
    else await verifyWorkflowConfig(this.config, { throwOnError: false })

    lgg.log("setting up workflow", this.workflowVersionId)

    // Only register the workflow version (if persistence enabled)
    if (this.persistence) {
      await this.persistence.createWorkflowVersion({
        workflowVersionId: this.workflowVersionId,
        workflowId: this.workflowId,
        commitMessage: this.goal,
        dsl: this.config,
        generationId: this.evolutionContext?.generationId,
        operation: this.parent1Id ? "mutation" : "init",
        parent1Id: this.parent1Id,
        parent2Id: this.parent2Id,
      })
    }

    for (const workflowNodeConfig of this.config.nodes) {
      const workflowNode = await WorkFlowNode.create(
        workflowNodeConfig,
        this.workflowVersionId,
        false,
        this.persistence,
      )
      this.nodeMap.set(workflowNodeConfig.nodeId, workflowNode)
      this.nodes.push(workflowNode)
    }
  }

  /**
   * Creates a workflow invocation for a specific WorkflowIO.
   * @param index - The index of the WorkflowIO in the array
   * @param workflowIO - The specific WorkflowIO object for this invocation
   * @returns The created workflowInvocationId
   */
  async createInvocationForIO(index: number, workflowIO: WorkflowIO): Promise<string> {
    const workflowInvocationId = genShortId()

    if (this.persistence) {
      try {
        await this.persistence.createWorkflowInvocation({
          workflowInvocationId,
          workflowVersionId: this.workflowVersionId,
          runId: this.evolutionContext?.runId,
          generationId: this.evolutionContext?.generationId,
          metadata: {
            configFiles: this.config.contextFile ? [this.config.contextFile] : [],
            workflowIOIndex: index,
          },
          expectedOutputType: this.evaluationInput.outputSchema
            ? JSON.stringify(this.evaluationInput.outputSchema, null, 2).replace(/[\n\s]+/g, " ")
            : null,
          workflowInput: workflowIO.workflowInput as any,
          workflowOutput: workflowIO.workflowOutput as any,
        })
      } catch (error) {
        lgg.error(
          `[Workflow] Failed to create workflow invocation ${workflowInvocationId} for version ${this.workflowVersionId}`,
          error,
        )
        throw new Error(`Failed to save workflow invocation: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    this.workflowInvocationIds.set(index, workflowInvocationId)
    return workflowInvocationId
  }

  /**
   * Gets node by nodeId.
   * @throws if node not found
   */
  getNode(nodeId: string): WorkFlowNode {
    const node = this.nodeMap.get(nodeId)
    guard(node, `Node ${nodeId} not found`)
    return node
  }

  /**
   * Gets all node IDs in the workflow.
   */
  getNodeIds(): string[] {
    return Array.from(this.nodeMap.keys())
  }

  /**
   * Gets the entry node ID from the workflow config.
   */
  getEntryNodeId(): string {
    guard(this.config.entryNodeId, "Entry node ID is not set")
    return this.config.entryNodeId
  }

  getNodes(): WorkFlowNode[] {
    return this.nodes
  }

  getWorkflowId(): string {
    return this.workflowId
  }

  /**
   * Gets the workflow invocation ID for a specific index.
   * @param index - The index of the WorkflowIO
   * @throws if workflow invocation has not been created for this index
   * @deprecated this is not safe, since it only returns the last invocation.
   */
  getWorkflowInvocationId(index?: number): string {
    // If no index provided, return the first one (for backward compatibility)
    const idx = index ?? 0
    const invocationId = this.workflowInvocationIds.get(idx)
    guard(invocationId, `Workflow invocation ID not found for index ${idx}. Create invocation first.`)
    return invocationId
  }

  /**
   * Gets the workflow's main goal.
   */
  get goal(): string {
    return this.mainGoal
  }

  /**
   * Gets or creates a ContextStore for this workflow.
   * @param name - Name of the context store (e.g., "fishcontext")
   * @param backend - Backend to use ("memory" or "supabase")
   * @returns ContextStore instance
   */
  getContextStore(name: string, backend: "memory" | "supabase" = "supabase", index?: number): ContextStore {
    const key = `${name}_${index ?? 0}`
    if (this.contextStores.has(key)) {
      return this.contextStores.get(key)!
    }

    let store: ContextStore
    if (backend === "memory") {
      const invocationId = this.workflowInvocationIds.get(index ?? 0)
      store = createContextStore("memory", invocationId || "default")
    } else {
      const invocationId = ensure(
        this.workflowInvocationIds.get(index ?? 0),
        `Workflow invocation must be created for index ${index ?? 0} before creating Supabase context stores`,
      )
      store = createContextStore("supabase", invocationId)
    }

    this.contextStores.set(key, store)
    return store
  }

  /**
   * Lists all context store names for this workflow.
   */
  getContextStoreNames(): string[] {
    return Array.from(this.contextStores.keys())
  }

  /**
   * Gets the current context file count for this workflow.
   */
  getWorkflowFileCount(): number {
    return this.workflowFiles.size
  }

  /**
   * Gets all workflow files for this workflow.
   */
  getWorkflowFiles(): Set<WorkflowFile> {
    return new Set(this.workflowFiles)
  }

  /**
   * Adds a workflow file to this workflow's tracking.
   */
  addWorkflowFile(workflowFile: WorkflowFile): void {
    this.workflowFiles.add(workflowFile)
  }

  getToolExecutionContext(workflowInvocationId: string): ToolExecutionContext {
    const files = this.getWorkflowFiles() ? Array.from(this.getWorkflowFiles()) : []

    const context: ToolExecutionContext = {
      expectedOutputType: this.toolContext?.expectedOutputType,
      workflowInvocationId: workflowInvocationId,
      workflowVersionId: this.workflowVersionId,
      workflowFiles: files,
      mainWorkflowGoal: this.mainGoal,
      workflowId: this.workflowId,
    }
    return context
  }

  /**
   * Checks if a workflow file already exists for this workflow.
   */
  hasWorkflowFile(workflowFile: WorkflowFile): boolean {
    return this.workflowFiles.has(workflowFile)
  }

  /**
   * Checks if a new workflow file can be created based on the configured limit.
   */
  canCreateWorkflowFile(): boolean {
    const config = getCoreConfig()
    return this.workflowFiles.size < config.verification.maxFilesPerWorkflow
  }

  async improveNodesIteratively(params: {
    _fitness: FitnessOfWorkflow
    workflowInvocationId: string
  }): Promise<WorkflowImprovementResult> {
    const result = await improveNodesIterativelyImpl(this, {
      _fitness: params._fitness,
      workflowInvocationId: params.workflowInvocationId,
    })
    this.totalCost += result.cost
    return result
  }

  async saveToFile(fileName?: string): Promise<void> {
    await persistWorkflow(this.config, fileName || "setupfile.json")
  }

  toString(options: SimplifyOptions): string {
    return workflowToString(this, options)
  }

  getMemory(): Record<string, Record<string, string>> {
    const workflowMemory: Record<string, Record<string, string>> = {}
    for (const node of this.config.nodes) {
      if (node.memory) {
        workflowMemory[node.nodeId] = node.memory
      }
    }
    return workflowMemory
  }

  /**
   * Gets workflow-level memory (not node-specific memory)
   */
  getWorkflowMemory(): Record<string, string> {
    return this.config.memory || {}
  }

  /**
   * Generate a deterministic hash for a workflow
   */
  hash(): string {
    return hashWorkflow(this.config)
  }

  clone(): Workflow {
    return Workflow.create({
      config: this.config,
      evaluationInput: this.evaluationInput,
      parent1Id: this.parent1Id,
      parent2Id: this.parent2Id,
      evolutionContext: this.evolutionContext,
      toolContext: this.toolContext,
      persistence: this.persistence,
    })
  }

  addNode(node: WorkflowNodeConfig): void {
    this.config.nodes.push(node)
  }

  static async ideaToWorkflow({
    prompt,
    randomness,
    model,
  }: {
    prompt: string
    randomness: number
    model?: string
  }): Promise<RS<WorkflowConfig>> {
    const workflowIdeaResponse = await generateWorkflowIdea({
      prompt,
      randomness,
      model,
    })

    if (!workflowIdeaResponse.success) {
      lgg.error("ideaToWorkflow", workflowIdeaResponse.error)
      return R.error("Failed to generate workflow idea in generateWorkflowIdea", workflowIdeaResponse.usdCost)
    }

    if (isLoggingEnabled("GP")) {
      lgg.log(`[Converter] Workflow idea: ${workflowIdeaResponse.data.workflow}`)
    }

    const {
      data: fullWorkflowResult,
      error,
      usdCost,
      success,
    } = await formalizeWorkflow(workflowIdeaResponse.data.workflow, {
      verifyWorkflow: "normal",
      repairWorkflowAfterGeneration: true,
    })

    if (!success) {
      lgg.error("Failed to generate workflow from already generated idea - ideaToWorkflow 1", error)
      return R.error("Failed to generate workflow from already generated idea - ideaToWorkflow 2", usdCost)
    }

    return R.success(fullWorkflowResult, usdCost)
  }

  static async formalizeWorkflow(
    ...args: Parameters<typeof formalizeWorkflow>
  ): Promise<ReturnType<typeof formalizeWorkflow>> {
    return await formalizeWorkflow(...args)
  }

  // for GP, we need to reset the workflow to a new generation
  // if parents are surviving!
  reset(evolutionContext: EvolutionContext): void {
    this.totalCost = 0
    this.contextStores = new Map()
    this.workflowFiles = new Set()
    this.workflowInvocationIds = new Map()
    this.evolutionContext = evolutionContext
    this.evaluated = false
    this.hasRun = false
    this.runResults = undefined
    this.fitness = undefined
    this.feedback = null

    if ("genomeEvaluationResults" in this) {
      this.genomeEvaluationResults = {
        workflowVersionId: this.getWorkflowVersionId(),
        hasBeenEvaluated: false,
        evaluatedAt: new Date().toISOString(),
        fitness: null,
        costOfEvaluation: 0,
        errors: [],
        feedback: null,
      }
    }
    if ("evolutionCost" in this) {
      this.evolutionCost = 0
    }
  }
}

/**
 * Result returned by node-improvement operators.
 */
export interface WorkflowImprovementResult {
  /** Updated workflow configuration after improvements */
  newConfig: WorkflowConfig
  /** Additional USD cost incurred by the improvement process */
  cost: number
}
