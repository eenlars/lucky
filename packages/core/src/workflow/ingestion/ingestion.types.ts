/**
 * Evaluation input types for workflow ingestion.
 * RE-EXPORTS from @lucky/shared/contracts for backward compatibility.
 */

export * from "@lucky/shared/contracts/ingestion"

// Backward compat: OutputSchema now supports both JSON schema and Zod
export type { OutputSchema } from "@lucky/shared/contracts/ingestion"
