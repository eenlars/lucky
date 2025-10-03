/**
 * Persistence interface for the adapter pattern.
 * Core depends on these interfaces, not on Supabase.
 *
 * Two levels of persistence:
 * 1. IPersistence - workflow version management and invocation logging (all workflows)
 * 2. IEvolutionPersistence - evolution run and generation tracking (only for evolution)
 */

// ============ Data Types ============

export interface WorkflowVersionData {
  workflowVersionId: string
  workflowId: string
  commitMessage: string
  dsl: unknown
  generationId?: string
  operation?: "init" | "crossover" | "mutation" | "immigrant"
  parent1Id?: string
  parent2Id?: string
}

export interface WorkflowInvocationData {
  workflowInvocationId: string
  workflowVersionId: string
  runId?: string
  generationId?: string
  metadata?: unknown
  fitness?: unknown
  expectedOutputType?: unknown
  workflowInput?: unknown
  workflowOutput?: unknown
}

export interface WorkflowInvocationUpdate {
  workflowInvocationId: string
  status?: string
  endTime?: string
  usdCost?: number
  fitness?: unknown
  fitnessScore?: number
  accuracy?: number
  workflowOutput?: unknown
  feedback?: string
  [key: string]: unknown
}

export interface RunData {
  goalText: string
  config: unknown
  status: "running" | "completed" | "failed" | "cancelled"
  evolutionType: "iterative" | "gp"
  notes?: string
}

export interface GenerationData {
  generationNumber: number
  runId: string
}

export interface GenerationUpdate {
  generationId: string
  bestWorkflowVersionId?: string
  endTime?: string
  comment?: string
  feedback?: string
}

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

// ============ Node Persistence Interface ============

export interface NodeVersionData {
  nodeId: string
  workflowVersionId: string
  config: unknown
}

export interface NodeInvocationData {
  nodeId: string
  workflowInvocationId: string
  workflowVersionId: string
  startTime: string
  endTime?: string
  messageId: string
  usdCost: number
  output: unknown
  agentSteps?: unknown
  summary: string
  files?: string[]
  model: string
  updatedMemory?: Record<string, string>
}

export interface INodePersistence {
  saveNodeVersion(data: NodeVersionData): Promise<{ nodeVersionId: string }>
  saveNodeInvocation(data: NodeInvocationData): Promise<{ nodeInvocationId: string }>
  retrieveNodeSummaries(workflowInvocationId: string): Promise<Array<{ nodeId: string; summary: string }>>
  updateNodeMemory(nodeId: string, workflowVersionId: string, memory: Record<string, string>): Promise<void>
}

// ============ Message Persistence Interface ============

export interface MessageData {
  messageId: string
  fromNodeId?: string
  toNodeId?: string
  originInvocationId?: string
  seq?: number
  role: string
  payload: unknown
  createdAt: string
  workflowInvocationId: string
}

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
  createRun(data: RunData): Promise<string> // returns runId
  completeRun(runId: string, status: string, notes?: string): Promise<void>

  // Generation management
  createGeneration(data: GenerationData): Promise<string> // returns generationId
  completeGeneration(update: GenerationUpdate, stats?: PopulationStats): Promise<void>

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
  ensureWorkflowExists(workflowId: string, description: string): Promise<void>
  createWorkflowVersion(data: WorkflowVersionData): Promise<void>
  workflowVersionExists(workflowVersionId: string): Promise<boolean>
  updateWorkflowVersionWithIO(workflowVersionId: string, allWorkflowIO: unknown[]): Promise<void>

  // Workflow queries
  getWorkflowVersion(workflowVersionId: string): Promise<string | null>
  loadWorkflowConfig(workflowVersionId: string): Promise<unknown>
  loadWorkflowConfigForDisplay(workflowVersionId: string): Promise<unknown>
  loadLatestWorkflowConfig(workflowId?: string): Promise<unknown>
  updateWorkflowMemory(workflowVersionId: string, workflowConfig: unknown): Promise<void>

  // Workflow version helper (moved from IEvolutionPersistence)
  ensureWorkflowVersion(
    workflowVersionId: string,
    workflowId: string,
    workflowConfig: unknown,
    generationId: string,
    operation: string,
    goal: string,
  ): Promise<string>

  // Invocation management
  createWorkflowInvocation(data: WorkflowInvocationData): Promise<void>
  updateWorkflowInvocation(data: WorkflowInvocationUpdate): Promise<unknown>

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
