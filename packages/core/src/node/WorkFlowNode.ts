import { lgg } from "@core/utils/logging/Logger" // src/core/node/WorkFlowNode.ts

import { createHash } from "node:crypto"
import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import { selfImproveHelper } from "@core/improvement/behavioral/self-improve/node/selfImproveHelper"
import type { Payload } from "@core/messages/MessagePayload"
import type { WorkflowMessage } from "@core/messages/WorkflowMessage"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import type { InvocationSummary } from "@core/messages/summaries"
import { genShortId } from "@core/utils/common/utils"
import { NodePersistenceManager } from "@core/utils/persistence/node/nodePersistence"
import type { ModelName } from "@core/utils/spending/models.types"
import type { WorkflowConfig, WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import type { ToolExecutionContext } from "@lucky/tools"
import type { IPersistence } from "@together/adapter-supabase"
import chalk from "chalk"
import { InvocationPipeline } from "../messages/pipeline/InvocationPipeline"
import type { NodeInvocationCallContext } from "../messages/pipeline/input.types"
import { ToolManager } from "./toolManager"

export interface NodeInvocationResult {
  nodeInvocationId: string
  nodeInvocationFinalOutput: string
  summaryWithInfo: InvocationSummary //todo-summary: allow null later
  replyMessage: Payload
  nextIds: readonly string[]
  /** Optional: when present, use these to enqueue exact per-target messages */
  outgoingMessages?: { toNodeId: string; payload: Payload }[]
  usdCost: number
  error?: {
    message: string
    stack?: string
  }
  agentSteps: AgentSteps
  updatedMemory?: Record<string, string>
  debugPrompts: string[]
}

export class WorkFlowNode {
  // ————— Public identifiers —————
  public readonly nodeId: string
  public readonly nodeVersionId: string

  // ————— Core components —————
  private readonly config: WorkflowNodeConfig
  private readonly toolManager: ToolManager
  private readonly persistenceManager: NodePersistenceManager
  private agentSteps: AgentSteps | null = null

  /**
   * Private constructor: no async work, no runtime‐only wiring.
   */
  private constructor(
    config: WorkflowNodeConfig,
    workflowVersionId: string,
    skipDatabasePersistence = false,
    persistence?: IPersistence,
  ) {
    this.nodeId = config.nodeId
    this.nodeVersionId = genShortId()
    this.config = config

    // Create managers
    this.toolManager = new ToolManager(config.nodeId, config.mcpTools, config.codeTools, workflowVersionId)

    this.persistenceManager = new NodePersistenceManager(
      config.nodeId,
      config,
      {},
      skipDatabasePersistence,
      persistence,
    )

    // Debug: Log if node has memory
    if (config.memory && Object.keys(config.memory).length > 0 && NodePersistenceManager.verbose) {
      lgg.log(`[WorkFlowNode] Created node ${config.nodeId} with memory: ${JSON.stringify(config.memory)}`)
    }

    // Register node in database
    this.persistenceManager.registerNode(workflowVersionId)
  }

  /**
   * Create + fully initialize tools before returning.
   */
  public static async create(
    config: WorkflowNodeConfig,
    workflowVersionId: string,
    skipDatabasePersistence = false,
    persistence?: IPersistence,
  ): Promise<WorkFlowNode> {
    const node = new WorkFlowNode(config, workflowVersionId, skipDatabasePersistence, persistence)
    await node.toolManager.initializeTools()
    return node
  }

  // ————— Getters for external inspection —————
  public getNodeId(): string {
    return this.nodeId
  }

  public getNodeVersionId(): string {
    return this.nodeVersionId
  }

  public getDescription(): string {
    return this.config.description
  }

  public getModelName(): ModelName {
    return this.config.modelName
  }

  public getHandOffs(): string[] {
    return this.config.handOffs
  }

  public getHandOffsString(): string {
    if (this.config.handOffs.length === 0) {
      return "no one"
    }

    return this.config.handOffs.join(", ")
  }

  public getMCPTools(): Record<string, any> {
    return this.toolManager.getMCPTools()
  }

  public getCodeTools(): Record<string, any> {
    return this.toolManager.getCodeTools()
  }

  public getMemory(): Record<string, string> {
    return this.persistenceManager.getMemory()
  }

  /**
   * Self-improvement via the helper; keeps config + memory in sync.
   */
  public async selfImprove(params: {
    workflowInvocationId: string
    fitness: FitnessOfWorkflow
    setup: WorkflowConfig
    goal: string
  }): Promise<WorkflowNodeConfig> {
    const updatedConfig = await selfImproveHelper({
      n: this,
      workflowInvocationId: params.workflowInvocationId,
      fitness: params.fitness,
      setup: params.setup,
      goal: params.goal,
    })

    // Update config and memory
    this.persistenceManager.updateMemory(updatedConfig.config.memory ?? {})
    return updatedConfig.config
  }

  /**
   * Invokes the node and processes workflow messages through AI model generation.
   * Uses the pipeline pattern for better organization and error handling.
   */
  public async invoke({
    workflowMessageIncoming,
    workflowInvocationId,
    workflowVersionId,
    workflowFiles,
    expectedOutputType,
    mainWorkflowGoal,
    workflowId,
    workflowConfig,
    skipDatabasePersistence,
    persistence,
  }: {
    workflowMessageIncoming: WorkflowMessage
    workflowVersionId: string
    inputFile?: string // todo-files-context this needs to work later stage.
    evalExplanation?: string
    outputType?: any
    workflowConfig?: WorkflowConfig // Added for hierarchical role inference
    skipDatabasePersistence?: boolean
    persistence?: IPersistence
  } & ToolExecutionContext): Promise<NodeInvocationResult> {
    try {
      // Ensure tools are initialized
      await this.toolManager.initializeTools()

      // Create invocation context
      const context: NodeInvocationCallContext = {
        nodeConfig: this.config,
        nodeMemory: this.getMemory(),
        workflowMessageIncoming,
        workflowInvocationId,
        workflowVersionId,
        workflowId,
        workflowFiles,
        expectedOutputType,
        mainWorkflowGoal,
        startTime: new Date().toISOString(),
        workflowConfig,
        skipDatabasePersistence,
        persistence,
        toolStrategyOverride: "v3" as const,
      }

      // Create pipeline
      const pipeline = new InvocationPipeline(context, this.toolManager, true)

      // Execute pipeline steps sequentially
      await pipeline.prepare()
      await pipeline.execute()
      const result = await pipeline.process()

      if (!result.summaryWithInfo) {
        throw new Error("[WorkFlowNode] no summary with info")
      }

      this.agentSteps = result.agentSteps ?? null

      // Update memory if provided
      if (result.updatedMemory) {
        this.persistenceManager.updateMemory(result.updatedMemory)
      }

      return result
    } catch (error) {
      lgg.error(chalk.red("Error in invoke!"), error)

      throw error
    }
  }

  /** Export current config */
  public toConfig(): WorkflowNodeConfig {
    return {
      ...this.config,
      memory: this.persistenceManager.getMemory(),
    }
  }

  hashNode(): string {
    return createHash("sha256").update(JSON.stringify(this.config)).digest("hex")
  }
}
