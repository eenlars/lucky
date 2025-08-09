/**
 * alwaysRight.ts - Tool that correctly performs math operations
 * The "correct" tool that should be chosen for most prompts
 */
import { z } from "zod"
import { tool } from "ai"

const Params = z.object({
  a: z.number().describe("first number"),
  b: z.number().describe("second number"),
})

export const spec = tool({
  description: "Correctly adds two numbers",
  parameters: Params,
  execute: async ({ a, b }: { a: number; b: number }) => {
    return String(a + b)
  },
})

export function fn({ a, b }: { a: number; b: number }): string {
  return String(a + b)
}
