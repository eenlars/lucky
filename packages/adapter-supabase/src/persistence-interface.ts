/**
 * Persistence interface for the adapter pattern.
 * Core depends on these interfaces, not on Supabase.
 *
 * Two levels of persistence:
 * 1. IPersistence - workflow version management and invocation logging (all workflows)
 * 2. IEvolutionPersistence - evolution run and generation tracking (only for evolution)
 */

import type { Enums, Payload, Tables, TablesInsert, TablesUpdate } from "@lucky/shared"

// ============ Helper Types ============

export interface EvolutionContext {
  runId: string
  generationId: string
  generationNumber: number
}

export interface PopulationStats {
  generation: number
  bestFitness: number
  worstFitness: number
  avgFitness: number
  fitnessStdDev: number
  evaluationCost: number
  evaluationsPerHour: number
  improvementRate: number
}

// ============ Lifecycle Data Types (field name conversion helpers) ============

/**
 * Helper type for creating NodeInvocation records with camelCase field names.
 * Converts to snake_case for database storage.
 */
export interface NodeInvocationStartData {
  nodeInvocationId?: string
  nodeId: string
  nodeVersionId: string
  workflowInvocationId: string
  workflowVersionId: string
  startTime: string
  model: string
  attemptNo?: number
}

/**
 * Helper type for updating NodeInvocation records with camelCase field names.
 * Converts to snake_case for database updates.
 */
export interface NodeInvocationEndData {
  nodeInvocationId: string
  endTime: string
  status: "completed" | "failed"
  output: unknown
  summary: string
  usdCost: number
  agentSteps?: unknown
  files?: string[]
  updatedMemory?: Record<string, string>
  error?: unknown
}

/**
 * Helper type for Message records with camelCase field names.
 * Converts to snake_case for database storage.
 */
export interface MessageData {
  messageId: string
  fromNodeId?: string
  toNodeId?: string
  originInvocationId?: string
  seq?: number
  role: Enums<"MessageRole">
  payload: Payload
  createdAt: string
  workflowInvocationId: string
}

// ============ Node Persistence Interface ============

export interface INodePersistence {
  saveNodeVersion(data: TablesInsert<"NodeVersion">, clerkId?: string): Promise<{ nodeVersionId: string }>

  // Lifecycle methods (new pattern)
  createNodeInvocationStart(data: NodeInvocationStartData): Promise<{ nodeInvocationId: string }>
  updateNodeInvocationEnd(data: NodeInvocationEndData): Promise<void>

  // Legacy method (keep for backwards compat)
  saveNodeInvocation(data: TablesInsert<"NodeInvocation">, clerkId?: string): Promise<{ nodeInvocationId: string }>

  retrieveNodeSummaries(workflowInvocationId: string): Promise<Array<{ nodeId: string; summary: string }>>
  updateNodeMemory(nodeId: string, workflowVersionId: string, memory: Record<string, string>): Promise<void>
}

// ============ Message Persistence Interface ============

export interface IMessagePersistence {
  save(message: MessageData): Promise<void>
  update(messageId: string, updates: Partial<MessageData>): Promise<void>
}

// ============ Evolution Persistence Interface ============

/**
 * Evolution-specific persistence operations.
 * Only needed for GP and iterative evolution modes.
 */
export interface IEvolutionPersistence {
  // Run management
  createRun(data: TablesInsert<"EvolutionRun">, clerkId?: string): Promise<string> // returns runId
  completeRun(runId: string, status: string, notes?: string): Promise<void>

  // Generation management
  createGeneration(data: TablesInsert<"Generation">): Promise<string> // returns generationId
  completeGeneration(update: TablesUpdate<"Generation">, stats?: PopulationStats): Promise<void>

  // Generation queries
  generationExists(runId: string, generationNumber: number): Promise<boolean>
  getGenerationIdByNumber(runId: string, generationNumber: number): Promise<string | null>
  getLastCompletedGeneration(runId: string): Promise<EvolutionContext | null>
}

// ============ Cleanup Stats ============

export interface CleanupStats {
  workflowInvocations: number
  nodeInvocations: number
  evolutionRuns: number
  generations: number
  messages: number
  evolutionRunsEndTimes: number
}

// ============ Dataset Record ============

export interface DatasetRecord {
  dataset_record_id: string
  workflow_input: string | null
  ground_truth: unknown
  [key: string]: unknown
}

// ============ Main Persistence Interface ============

/**
 * General workflow persistence operations.
 * Used by all workflows (both evolution and regular execution).
 */
export interface IPersistence {
  // Workflow management
  ensureWorkflowExists(workflowId: string, description: string, clerkId?: string): Promise<void>
  createWorkflowVersion(data: TablesInsert<"WorkflowVersion">): Promise<void>
  workflowVersionExists(workflowVersionId: string): Promise<boolean>
  updateWorkflowVersionWithIO(workflowVersionId: string, allWorkflowIO: unknown[]): Promise<void>

  // Workflow queries
  getWorkflowVersion(workflowVersionId: string): Promise<string | null>
  loadWorkflowConfig(workflowVersionId: string): Promise<unknown>
  loadWorkflowConfigForDisplay(workflowVersionId: string): Promise<unknown>
  loadLatestWorkflowConfig(workflowId?: string): Promise<unknown>
  updateWorkflowMemory(workflowVersionId: string, workflowConfig: unknown): Promise<void>

  // Workflow version helper (moved from IEvolutionPersistence)
  ensureWorkflowVersion(data: Tables<"WorkflowVersion">): Promise<void>

  // Invocation management
  createWorkflowInvocation(data: Tables<"WorkflowInvocation">): Promise<void>
  updateWorkflowInvocation(data: TablesUpdate<"WorkflowInvocation">): Promise<void>

  // Dataset management
  loadDatasetRecords(recordIds: string[]): Promise<DatasetRecord[]>

  // Maintenance operations
  cleanupStaleRecords(): Promise<CleanupStats>

  // Sub-interfaces for specialized operations
  nodes: INodePersistence
  messages: IMessagePersistence

  // Optional: evolution support
  // If provided, enables evolution tracking
  evolution?: IEvolutionPersistence
}
