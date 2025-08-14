import * as sendAIModule from "@core/messages/api/sendAI/sendAI"
import { selectToolStrategyV3 } from "@core/tools/any/selectToolStrategyV3"
import { getDefaultModels } from "@runtime/settings/models"
import type { ToolSet } from "ai"
import { zodSchema } from "ai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

const MODEL = getDefaultModels().default

describe("[gate] selectToolStrategyV3 integration (deterministic)", () => {
  const tools: ToolSet = {
    sum: {
      description: "add two numbers",
      parameters: zodSchema(z.object({ a: z.number(), b: z.number() })),
      execute: async ({ a, b }: { a: number; b: number }) => a + b,
    },
    echo: {
      description: "echo text",
      parameters: zodSchema(z.object({ text: z.string() })),
      execute: async ({ text }: { text: string }) => text,
    },
  }

  const systemMessage = "Choose the correct tool for the user request."

  beforeEach(() => {
    vi.resetAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("selects the 'sum' tool with reasoning", async () => {
    // Mock sendAI structured result to deterministically select 'sum'
    vi.spyOn(sendAIModule, "sendAI").mockResolvedValue({
      success: true,
      data: {
        type: "tool",
        toolName: "sum",
        reasoning: "User asked to add numbers; 'sum' is appropriate.",
        plan: "call sum with a=2 b=3",
        check: "result equals 5",
        expectsMutation: false,
      },
      usdCost: 0,
      error: null,
      debug_input: [],
      debug_output: {},
    } as any)

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
      expect(strategyResult.plan).toContain("a=2")
      expect(strategyResult.plan).toContain("b=3")
    }
  })
})
