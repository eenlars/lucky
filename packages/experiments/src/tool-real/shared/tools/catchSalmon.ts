/**
 * catchSalmon.ts - Specialized salmon-catching tool
 */
import { tool, zodSchema } from "ai"
import { z } from "zod"

const Params = z.object({
  river: z.string().describe("River or location for salmon fishing"),
})

export const spec = tool({
  description: "Specialized tool optimized for catching salmon.",
  inputSchema: zodSchema(Params),
  execute: async ({ river }: { river: string }) => {
    return `caught_salmon_at_${river.replace(/\s+/g, "_")}`
  },
})
