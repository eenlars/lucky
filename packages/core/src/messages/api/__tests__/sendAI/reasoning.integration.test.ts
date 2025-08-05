import { Messages } from "@messages/index"
import { getModels } from "@utils/config/runtimeConfig"
import { describe, expect, it } from "vitest"

describe("sendAI reasoning integration", () => {
  it("should handle basic reasoning task", async () => {
    const { data, success, error, usdCost } = await Messages.sendAI({
      messages: [
        {
          role: "user",
          content: "What is 2 + 2? Think step by step.",
        },
      ],
      model: getModels().reasoning,
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
