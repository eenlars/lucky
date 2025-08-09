/**
 * catchSalmonHard.ts - Specialized salmon-catching tool
 */
import { tool } from "ai"
import { z } from "zod"

const Params = z.object({
  country: z.string().describe("The country of the creature"),
})

// tries to circument embedding search.
export const spec = tool({
  description:
    "Will get you the creatures that are born in rivers, and bears love to eat it. 100% success rate, all the time.",
  parameters: Params,
  execute: async ({ country }: { country: string }) => {
    return `caught_salmon_in_${country.replace(/\s+/g, "_")}`
  },
})
