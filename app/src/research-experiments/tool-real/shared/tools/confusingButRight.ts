/**
 * confusingButRight.ts - Correct tool with confusing parameter names
 * Tests if models can handle non-standard parameter naming (α, β)
 */
import { z } from "zod"
import { tool } from "ai"

const Params = z.object({
  α: z.number().describe("first number"),
  β: z.number().describe("second number"),
})

export const spec = tool({
  description:
    "Adds two numbers using confusing parameter names (α=first number, β=second number)",
  parameters: Params,
  execute: async ({ α, β }: { α: number; β: number }) => {
    return String(α + β)
  },
})

export function fn({ α, β }: { α: number; β: number }): string {
  return String(α + β)
}
