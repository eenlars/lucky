import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { getDefaultModels } from "@runtime/settings/constants.client"
import { describe, expect, it } from "vitest"

describe("sendAI reasoning integration", () => {
  it("should handle basic reasoning task", async () => {
    const { data, success, error, usdCost } = await sendAI({
      messages: [
        {
          role: "user",
          content:
            "what is 2+2? answer in the least amount of chars as possible",
        },
      ],
      model: getDefaultModels().reasoning,
      mode: "text",
      opts: {
        reasoning: true,
      },
    })

    console.log(data)

    expect(success).toBe(true)
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(typeof data).toBe("object")
    expect(data!.text).toBeDefined()
    expect(data!.text).toContain("4")
    // reasoning might be undefined if the model doesn't support it or didn't generate it
    if (data!.reasoning !== undefined) {
      expect(typeof data!.reasoning).toBe("string")
    }
    expect(usdCost).toBeGreaterThan(0)
  })
})
