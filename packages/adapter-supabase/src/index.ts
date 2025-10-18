/**
 * @together/adapter-supabase
 *
 * Persistence adapter for the together workflow system.
 * Provides optional database persistence through a clean interface.
 */

// Main factory function
export { createPersistence } from "./factory"
export type { PersistenceConfig } from "./factory"

// Type exports
export type {
  CleanupStats,
  DatasetRecord,
  EvolutionContext,
  IEvolutionPersistence,
  IMessagePersistence,
  INodePersistence,
  IPersistence,
  MessageData,
  NodeInvocationEndData,
  NodeInvocationStartData,
  PopulationStats,
} from "./persistence-interface"

// Error exports
export {
  DatasetRecordNotFoundError,
  InvalidInputError,
  NodeVersionMissingError,
  PersistenceError,
  WorkflowNotFoundError,
} from "./errors/domain-errors"

// Implementation exports (for advanced usage)
export { InMemoryPersistence } from "./memory-persistence"
export { SupabasePersistence } from "./supabase-persistence"
