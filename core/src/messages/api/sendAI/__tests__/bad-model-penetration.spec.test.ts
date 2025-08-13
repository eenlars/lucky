import { describe, expect, it } from "vitest"

import { sendAI } from "@core/messages/api/sendAI/sendAI"

// Integration test: use an invalid model string (nonsense and inactive) to trigger
// provider/model mapping errors and ensure our normalization returns readable info.

describe("sendAI – bad model penetration", () => {
  it("returns normalized error when model is invalid/unavailable", async () => {
    const weirdModels = [
      // invalid provider prefix
      "zzzzz/bogus-model-name",
      // wrong separator and casing
      "google_gemini-lite",
      // empty-ish
      " ",
    ]

    const model = weirdModels[
      Math.floor(Math.random() * weirdModels.length)
    ] as any // intentional any for negative test

    const result = await sendAI({
      mode: "text",
      model,
      messages: [{ role: "user", content: "Say hi" }],
      retries: 0,
    })

    expect(result.success).toBe(false)
    expect(typeof result.error).toBe("string")
    expect(result.error?.length).toBeGreaterThan(0)
    const dbg = result.debug_output as Record<string, unknown>
    expect(dbg).toBeDefined()
    if (typeof dbg?.name === "string") {
      expect(/AI_|Error/i.test(dbg.name)).toBe(true)
    }
  })
})
