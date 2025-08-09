/**
 * noops.ts - Collection of 100 filler tools that do nothing
 * Used to test tool capacity limits by adding noise to tool selection
 */
import { z } from "zod"
import { tool } from "ai"

const NoopParams = z.object({})

export const noopSpecs = Array.from({ length: 100 }, (_, i) => 
  tool({
    description: `Does nothing useful #${i}`,
    parameters: NoopParams,
    execute: async () => "noop",
  })
)

export const noopFns = Object.fromEntries(
  Array.from({ length: 100 }, (_, i) => [`noop_${i}`, () => "noop"])
)
