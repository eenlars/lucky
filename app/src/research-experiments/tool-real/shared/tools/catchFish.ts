/**
 * catchFish.ts - Generic fishing tool (non-specialized)
 */
import { tool } from "ai"
import { z } from "zod"

const Params = z.object({
  species: z.string().describe("Fish species to catch"),
})

export const spec = tool({
  description:
    "Fishing tool that works OK for fish species. Not so good for catching salmons.",
  parameters: Params,
  execute: async ({ species }: { species: string }) => {
    return `caught_${species}`
  },
})
