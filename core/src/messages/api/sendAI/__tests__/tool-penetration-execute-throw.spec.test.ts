import { tool } from "ai"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { getDefaultModels } from "@runtime/settings/models"

// Integration test: use a valid Tool that always throws in execute to
// exercise our normalization path after a provider call. Use gemini lite.

describe("sendAI tool mode – execute throw penetration", () => {
  it("normalizes thrown errors from tool execution (gemini lite)", async () => {
    const tools = {
      explode: tool({
        description: "Always throws",
        parameters: z.object({ reason: z.string().min(1) }),
        // Note: we intentionally throw here to break the pipeline
        async execute({ reason }): Promise<any> {
          throw new Error(`boom:${reason}`)
        },
      }),
    }

    const result = await sendAI({
      mode: "tool",
      model: getDefaultModels().default,
      messages: [
        {
          role: "user",
          content:
            "Call the explode tool with a reason; ensure the tool is invoked.",
        },
      ],
      opts: {
        tools: tools as any,
        // Using `as any` intentionally to bypass type constraints for a targeted negative path.
        toolChoice: { type: "tool", toolName: "explode" } as any,
        maxSteps: 1,
      },
      retries: 0,
    })

    expect(result.success).toBe(false)
    expect(typeof result.error).toBe("string")
    expect(result.error?.length).toBeGreaterThan(0)
    const dbg = result.debug_output as Record<string, unknown>
    expect(dbg).toBeDefined()
    if (typeof dbg?.name === "string") {
      // Either JS Error or AI_* wrapper
      expect(/AI_|Error/i.test(dbg.name)).toBe(true)
    }
  })
})
