import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { getDefaultModels } from "@core/core-config/compat"
import { describe, expect, it } from "vitest"

// TODO: This is an integration test making real API calls - should be excluded
// TODO: Only one test case - needs more coverage of reasoning functionality
// TODO: No error handling tests for reasoning mode failures
describe("sendAI reasoning integration", () => {
  it("should handle basic reasoning task", async () => {
    const { data, success, error, usdCost } = await sendAI({
      messages: [
        {
          role: "user",
          content: "what is 2+2? answer in the least amount of chars as possible",
        },
      ],
      model: getDefaultModels().reasoning,
      mode: "text",
      opts: {
        reasoning: true,
      },
    })

    // TODO: Remove console.log from test
    console.log(data)

    expect(success).toBe(true)
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(typeof data).toBe("object")
    expect(data!.text).toBeDefined()
    expect(data!.text).toContain("4")
    // TODO: This test doesn't actually verify reasoning was used
    // Just checks if reasoning exists, not if it's meaningful
    // reasoning might be undefined if the model doesn't support it or didn't generate it
    if (data!.reasoning !== undefined) {
      expect(typeof data!.reasoning).toBe("string")
    }
    expect(usdCost).toBeGreaterThan(0)
  })
})
