import { describe, expect, it } from "vitest"

import { getDefaultModels } from "@core/core-config/coreConfig"
import { sendAI } from "@core/messages/api/sendAI/sendAI"

// Integration test that attempts to break tool handling and exercises
// AI SDK error normalization. We intentionally construct invalid tools
// (typed as any by request) and force a toolChoice that does not exist.

describe("sendAI tool mode – penetration error", () => {
  it("returns normalized AI SDK error for invalid tool setup (gemini lite)", async () => {
    // Randomize some invalid shapes to try different failure paths without spamming
    const invalidShapes: any[] = [
      // missing parameters and execute
      { badToolA: { description: 123 } },
      // wrong types for parameters
      {
        badToolB: {
          description: "bad",
          parameters: { type: "object", properties: { x: { type: "number" } } },
          execute: "not-a-function",
        },
      },
      // not a tool object at all
      { badToolC: 42 },
    ]

    const tools: any = invalidShapes[Math.floor(Math.random() * invalidShapes.length)]

    const result = await sendAI({
      mode: "tool",
      model: getDefaultModels().default,
      messages: [
        {
          role: "user",
          content: "Call a tool that sums numbers. Purposely misconfigure so the call fails.",
        },
      ],
      opts: {
        tools,
        // Force the model to attempt a specific (nonexistent) tool.
        // Using `as any` intentionally to bypass type constraints in this negative test.
        toolChoice: { type: "tool", toolName: "nonexistent_tool" } as any,
        maxSteps: 1,
      },
      retries: 0,
    })

    expect(result.success).toBe(false)
    // Error message should be short and readable
    expect(typeof result.error).toBe("string")
    expect(result.error?.length).toBeGreaterThan(0)
    // Debug output should contain structured info; name may be AI_* or a JS Error
    const dbg = result.debug_output as Record<string, unknown>
    expect(dbg).toBeDefined()
    if (typeof dbg?.name === "string") {
      expect(/AI_|Error/i.test(dbg.name)).toBe(true)
    }
  })
})
