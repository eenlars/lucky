/**
 * Evaluation input types for workflow ingestion.
 * RE-EXPORTS from @lucky/contracts for backward compatibility.
 */

export * from "@lucky/contracts/ingestion"

// Backward compat: OutputSchema now supports both JSON schema and Zod
export type { OutputSchema } from "@lucky/contracts/ingestion"
