import type { ZodTypeAny } from "zod"

/**
 * Represents a file accessible to a workflow
 */
export type WorkflowFile = {
  store: "supabase"
  filePath: string // the supabase file path
  summary: string // what the file is about
}

/**
 * Zod schema representing the expected output type.
 */
export type OutputSchema = ZodTypeAny
