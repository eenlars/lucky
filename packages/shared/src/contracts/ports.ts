/**
 * Port interfaces for adapter pattern.
 * These define the contract between core business logic and infrastructure adapters.
 * Ports speak only domain language - no database types, no framework-specific types.
 */

import type {
  CompleteGenerationPatch,
  CompleteWorkflowInvocationPatch,
  CreateGenerationCmd,
  CreateRunCmd,
  CreateWorkflowCmd,
  CreateWorkflowVersionCmd,
  EvolutionRun,
  Generation,
  GenerationId,
  RunId,
  StartWorkflowInvocationCmd,
  Workflow,
  WorkflowId,
  WorkflowInvocation,
  WorkflowInvocationId,
  WorkflowVersion,
  WorkflowVersionId,
} from "./persistence"

/**
 * Port interface for persistence operations.
 * Implementations must translate between domain models and their storage mechanism.
 */
export interface PersistencePort {
  workflows: {
    ensure(workflow: CreateWorkflowCmd): Promise<void>
  }

  versions: {
    create(cmd: CreateWorkflowVersionCmd): Promise<WorkflowVersion>
    getById(id: WorkflowVersionId): Promise<WorkflowVersion | null>
    exists(id: WorkflowVersionId): Promise<boolean>
  }

  invocations: {
    start(cmd: StartWorkflowInvocationCmd): Promise<WorkflowInvocation>
    complete(patch: CompleteWorkflowInvocationPatch): Promise<WorkflowInvocation>
    getById(id: WorkflowInvocationId): Promise<WorkflowInvocation | null>
  }

  evolution: {
    runs: {
      create(cmd: CreateRunCmd): Promise<EvolutionRun>
      complete(runId: RunId, status: "completed" | "interrupted", notes?: string): Promise<void>
      getById(id: RunId): Promise<EvolutionRun | null>
    }
    generations: {
      create(cmd: CreateGenerationCmd): Promise<Generation>
      complete(patch: CompleteGenerationPatch): Promise<void>
      getById(id: GenerationId): Promise<Generation | null>
      getLastCompleted(runId: RunId): Promise<Generation | null>
    }
  }

  withTransaction<T>(fn: (tx: PersistencePort) => Promise<T>): Promise<T>
}
