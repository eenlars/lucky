/**
 * @together/adapter-supabase
 *
 * Persistence adapter for the together workflow system.
 * Provides optional database persistence through a clean interface.
 */

export type {
  IPersistence,
  IEvolutionPersistence,
  INodePersistence,
  IMessagePersistence,
  WorkflowVersionData,
  WorkflowInvocationData,
  WorkflowInvocationUpdate,
  NodeVersionData,
  NodeInvocationData,
  MessageData,
  RunData,
  GenerationData,
  GenerationUpdate,
  EvolutionContext,
  PopulationStats,
  CleanupStats,
  DatasetRecord,
} from "./persistence-interface"

export { SupabasePersistence } from "./supabase-persistence"
export { InMemoryPersistence } from "./memory-persistence"
export { getSupabaseClient, resetSupabaseClient } from "./client"
