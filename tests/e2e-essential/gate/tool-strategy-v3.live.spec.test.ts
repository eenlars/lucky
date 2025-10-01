import { selectToolStrategyV3 } from "@core/messages/pipeline/selectTool/selectToolStrategyV3"
import { getDefaultModels } from "@examples/settings/models"
import type { ToolSet } from "ai"
import { zodSchema } from "ai"
import { describe, expect, it } from "vitest"
import { z } from "zod"

// Helper: detect placeholder envs from tests/setup/env.ts
const hasRealOpenRouterKey =
  typeof process.env.OPENROUTER_API_KEY === "string" && !process.env.OPENROUTER_API_KEY.startsWith("test-")

// Use a cheap/fast default model via our runtime config
const MODEL = getDefaultModels().default

/**
 * Live integration test: calls the real model to choose a tool.
 * Mirrors tool-strategy-v3.integration.test.ts but without mocks.
 */
describe("[gate] selectToolStrategyV3 live (no mocks)", () => {
  const tools: ToolSet = {
    sum: {
      description: "add two numbers",
      parameters: zodSchema(z.object({ a: z.number(), b: z.number() })),
      // Not executed here; only selection is tested.
      execute: async ({ a, b }: { a: number; b: number }) => a + b,
    },
    echo: {
      description: "echo text",
      parameters: zodSchema(z.object({ text: z.string() })),
      execute: async ({ text }: { text: string }) => text,
    },
  }

  const systemMessage = "Choose the correct tool for the user request."

  const runner = hasRealOpenRouterKey ? it : it.skip

  runner(
    "selects the 'sum' tool (live)",
    async () => {
      const { strategyResult, debugPrompt } = await selectToolStrategyV3({
        tools,
        identityPrompt: "Please add 2 and 3",
        agentSteps: [],
        roundsLeft: 1,
        systemMessage,
        model: MODEL,
      })

      expect(typeof debugPrompt).toBe("string")
      expect(strategyResult.type).toBe("tool")
      if (strategyResult.type === "tool") {
        expect(String(strategyResult.toolName)).toBe("sum")
        expect(typeof strategyResult.reasoning).toBe("string")
      }
    },
    120_000,
  )
})
