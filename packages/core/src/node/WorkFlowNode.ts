import { lgg } from "@core/utils/logging/Logger" // src/core/node/WorkFlowNode.ts

import { createHash } from "node:crypto"
import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import { selfImproveHelper } from "@core/improvement/behavioral/self-improve/node/selfImproveHelper"
import type { Payload } from "@core/messages/MessagePayload"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import type { InvocationSummary } from "@core/messages/summaries/createSummary"
import { emitAgentEnd, emitAgentError, emitAgentStart } from "@core/utils/observability/agentEvents"
import { NodePersistenceManager } from "@core/utils/persistence/node/nodePersistence"

import type { WorkflowConfig, WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import { genShortId } from "@lucky/shared"
import type {
  IWorkflowNode,
  NodeInvocationResult as NodeInvocationResultBase,
  SelfImproving,
  SupportsCodeTools,
  SupportsMCPTools,
} from "@lucky/shared/contracts/agent"
import type { IPersistence } from "@together/adapter-supabase"
import chalk from "chalk"
import { InvocationPipeline } from "../messages/pipeline/InvocationPipeline"
import type { NodeInvocationCallContext } from "../messages/pipeline/input.types"
import { ToolManager } from "./toolManager"

/**
 * Extended result type with implementation-specific fields
 */
export interface NodeInvocationResult extends NodeInvocationResultBase {
  summaryWithInfo: InvocationSummary //todo-summary: allow null later
  replyMessage: Payload
  /** Optional: when present, use these to enqueue exact per-target messages */
  outgoingMessages?: { toNodeId: string; payload: Payload }[]
  debugPrompts: string[]
}

/**
 * Concrete implementation of IWorkflowNode with MCP tools, code tools, and self-improvement support
 */
export class WorkFlowNode
  implements
    IWorkflowNode<Payload, InvocationSummary, WorkflowNodeConfig>,
    SupportsMCPTools,
    SupportsCodeTools,
    SelfImproving<WorkflowNodeConfig>
{
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

  public getModelName(): string {
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
      persistence: this.persistenceManager.getPersistence(),
    })

    // Update config and memory
    this.persistenceManager.updateMemory(updatedConfig.config.memory ?? {})
    return updatedConfig.config
  }

  /**
   * Invokes the node and processes workflow messages through AI model generation.
   * Uses the pipeline pattern for better organization and error handling.
   */
  public async invoke(context: NodeInvocationCallContext): Promise<NodeInvocationResult> {
    const startTime = Date.now()

    // Emit agent.start event
    emitAgentStart(this.nodeId, this.config.description)

    try {
      // Ensure tools are initialized
      await this.toolManager.initializeTools()

      // Enhance context with node-specific data if not already present
      const enhancedContext: NodeInvocationCallContext = {
        ...context,
        nodeConfig: context.nodeConfig ?? this.config,
        nodeMemory: context.nodeMemory ?? this.getMemory(),
        startTime: context.startTime ?? new Date().toISOString(),
        toolStrategyOverride: context.toolStrategyOverride ?? ("v3" as const),
      }

      // Create pipeline with enhanced context
      const pipeline = new InvocationPipeline(enhancedContext, this.toolManager, true)

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

      // Emit agent.end event
      const duration = Date.now() - startTime
      emitAgentEnd(this.nodeId, duration, result.usdCost)

      return result
    } catch (error) {
      lgg.error(chalk.red("Error in invoke!"), error)

      // Emit agent.error event
      emitAgentError(this.nodeId, error instanceof Error ? error : new Error(String(error)))

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
