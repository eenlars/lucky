/**
 * Domain contracts for persistence layer.
 * These types use business terminology (camelCase) and are stable across database schema changes.
 * The adapter is responsible for translating between these domain types and database types.
 */

// ============ Branded Entity IDs ============

export type WorkflowId = string & { readonly __brand: "WorkflowId" }
export type WorkflowVersionId = string & { readonly __brand: "WorkflowVersionId" }
export type WorkflowInvocationId = string & { readonly __brand: "WorkflowInvocationId" }
export type GenerationId = string & { readonly __brand: "GenerationId" }
export type RunId = string & { readonly __brand: "RunId" }
export type NodeVersionId = string & { readonly __brand: "NodeVersionId" }
export type NodeInvocationId = string & { readonly __brand: "NodeInvocationId" }
export type MessageId = string & { readonly __brand: "MessageId" }

// ============ Write Commands (what callers send) ============

export type CreateWorkflowCmd = {
  id: WorkflowId
  description: string
  clerkId?: string
}

export type CreateWorkflowVersionCmd = {
  versionId?: WorkflowVersionId
  workflowId: WorkflowId
  dsl: unknown
  operation: "init" | "crossover" | "mutation" | "immigrant"
  commitMessage: string
  generationId?: GenerationId
  parents?: {
    parent1Id?: WorkflowVersionId
    parent2Id?: WorkflowVersionId
  }
  clerkId?: string
  inputSchema?: unknown
  knowledge?: unknown
}

export type StartWorkflowInvocationCmd = {
  invocationId: WorkflowInvocationId
  versionId: WorkflowVersionId
  input?: unknown
  run?: {
    runId: RunId
    generationId?: GenerationId
  }
  clerkId?: string
  datasetRecordId?: string
  evaluatorId?: string
}

export type CompleteWorkflowInvocationPatch = {
  invocationId: WorkflowInvocationId
  status: "completed" | "failed"
  endedAt?: Date
  output?: unknown
  usdCost?: number
  fitness?: unknown
  accuracy?: number
  actualOutput?: string
  expectedOutput?: string
}

export type CreateRunCmd = {
  runId?: RunId
  goalText: string
  config: unknown
  status?: "running" | "completed" | "interrupted"
  evolutionType?: "gp" | "iterative"
  clerkId?: string
}

export type CreateGenerationCmd = {
  generationId?: GenerationId
  number: number
  runId: RunId
  clerkId?: string
}

export type CompleteGenerationPatch = {
  generationId: GenerationId
  bestWorkflowVersionId?: WorkflowVersionId
  comment?: string
  feedback?: string
}

// ============ Read Models (what callers get back) ============

export type Workflow = {
  id: WorkflowId
  description: string
  createdAt: string
}

export type WorkflowVersion = {
  id: WorkflowVersionId
  workflowId: WorkflowId
  dsl: unknown
  operation: "init" | "crossover" | "mutation" | "immigrant"
  commitMessage: string
  generationId?: GenerationId
  parents?: {
    parent1Id?: WorkflowVersionId
    parent2Id?: WorkflowVersionId
  }
  createdAt: string
  iterationBudget: number
  timeBudgetSeconds: number
  inputSchema?: unknown
  knowledge?: unknown
}

export type WorkflowInvocation = {
  id: WorkflowInvocationId
  versionId: WorkflowVersionId
  status: "running" | "completed" | "failed"
  startedAt: string
  endedAt?: string
  usdCost: number
  input?: unknown
  output?: unknown
  run?: {
    runId: RunId
    generationId?: GenerationId
  }
  fitness?: unknown
  accuracy?: number
  datasetRecordId?: string
  evaluatorId?: string
}

export type EvolutionRun = {
  id: RunId
  goalText: string
  config: unknown
  status: "running" | "completed" | "interrupted"
  startedAt: string
  endedAt?: string
  evolutionType?: "gp" | "iterative"
  notes?: string
}

export type Generation = {
  id: GenerationId
  number: number
  runId: RunId
  startedAt: string
  endedAt?: string
  bestWorkflowVersionId?: WorkflowVersionId
  comment?: string
  feedback?: string
}
