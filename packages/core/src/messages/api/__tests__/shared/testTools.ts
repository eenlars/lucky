/**
 * Shared test tools for API integration tests
 * Consolidates duplicate tool definitions across test files
 */
import { tool, zodSchema } from "ai"
import { z } from "zod"

// Standard input schema for simple test tools
const SimpleToolParams = z.object({
  input: z.string().optional(),
})

/**
 * Creates a sequential tool chain for testing
 * Replaces hardcoded tool definitions in generateText and generateTextWithStrategy tests
 */
export const createSequentialTestTools = () => {
  const tool1 = tool({
    description: "First tool in sequence - returns fixed value",
    inputSchema: zodSchema(SimpleToolParams),
    execute: async () => "555",
  })

  const tool2 = tool({
    description: "Second tool in sequence - processes input conditionally",
    inputSchema: zodSchema(SimpleToolParams),
    execute: async ({ input }: { input?: string }) => {
      return input === "555" ? "B" : "2"
    },
  })

  const tool3 = tool({
    description: "Third tool in sequence - final processing",
    inputSchema: zodSchema(SimpleToolParams),
    execute: async ({ input }: { input?: string }) => {
      return input === "B" ? "9" : "C"
    },
  })

  return {
    tool1,
    tool2,
    tool3,
    // Named versions for strategy tests
    nod_333: tool1,
    mod_888: tool2,
    rod_999: tool3,
  }
}

/**
 * Creates distractor tools for strategy testing
 * These should be filtered out by tool selection strategies
 */
export const createDistractorTools = () => {
  const rod_333 = tool({
    description: "Distractor tool - should be ignored",
    inputSchema: zodSchema(SimpleToolParams),
    execute: async () => "F",
  })

  const mod_333 = tool({
    description: "Another distractor tool - should be ignored",
    inputSchema: zodSchema(SimpleToolParams),
    execute: async () => "F",
  })

  return {
    rod_333,
    mod_333,
  }
}

/**
 * Standard system prompts for sequential tool tests
 */
export const SEQUENTIAL_SYSTEM_PROMPTS = {
  basic: "You must first run nod-333, then mod-888 with nod-333's output, then rod-999 with mod-888's output.",
  withStrategy:
    "You must first run nod_333, then mod_888 with nod_333's output, then rod_999 with mod_888's output. Execute the tools in this exact sequence.",
} as const

/**
 * Standard user messages for tool tests
 */
export const TOOL_TEST_MESSAGES = {
  execute: "Execute the three tools in sequence",
} as const

/**
 * Expected results for sequential tool execution
 */
export const EXPECTED_SEQUENTIAL_RESULTS = {
  tool1: "555",
  tool2: "B",
  tool3: "9",
} as const
