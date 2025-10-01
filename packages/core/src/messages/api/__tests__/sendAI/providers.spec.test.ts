import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { describe, expect, it } from "vitest"

// TODO: This test makes real API calls and should be excluded from main test suite
// TODO: Test name says "Groq provider" but uses "moonshotai/kimi-k2" model - inconsistent
// TODO: Missing error handling tests for provider-specific failures
// TODO: No verification that the correct provider is actually being used
describe("sendAI with Groq provider", () => {
  it("should successfully generate text using Groq model", async () => {
    const result = await sendAI({
      mode: "text",
      messages: [
        {
          role: "user",
          content: "Say hello in exactly 3 words.",
        },
      ],
      model: "moonshotai/kimi-k2" as any,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.text).toBeDefined()
      expect(typeof result.data.text).toBe("string")
      // TODO: This assertion is too weak - only checks that text exists
      // Should verify response quality or structure
      expect(result.data.text.length).toBeGreaterThan(0)
      expect(result.usdCost).toBeGreaterThan(0)
      expect(result.error).toBeNull()
    }
  }, 30000)
})
