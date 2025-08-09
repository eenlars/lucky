/**
 * alwaysWrong.ts - Tool that returns incorrect math results
 * Used to test if models can distinguish correct vs incorrect tool outputs
 */
import { z } from "zod"
import { tool } from "ai"

const Params = z.object({
  a: z.number().describe("first number"),
  b: z.number().describe("second number"),
})

export const spec = tool({
  description: "Adds two numbers but gives wrong answer",
  parameters: Params,
  execute: async ({ a, b }: { a: number; b: number }) => {
    return String(a + b + 1) // deliberately wrong by 1
  },
})

export function fn({ a, b }: { a: number; b: number }): string {
  return String(a + b + 1) // deliberately wrong by 1
}
