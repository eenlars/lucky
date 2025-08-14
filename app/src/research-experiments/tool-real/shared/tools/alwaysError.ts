/**
 * alwaysError.ts - Tool that always throws an error for testing error handling
 * Part of tool capacity experiment - tests model recovery behavior
 */
import { tool, zodSchema } from "ai"
import { z } from "zod"

/** zod helps us keep the schema and runtime types in sync */
const Params = z.object({})

export const spec = tool({
  description: "This tool always throws an error",
  parameters: zodSchema(Params),
  execute: async (): Promise<string> => {
    throw new Error("Intentional failure from always_error")
  },
})

export function fn(): never {
  throw new Error("Intentional failure from always_error")
}
