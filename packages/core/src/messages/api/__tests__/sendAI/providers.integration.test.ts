import { sendAI } from "@/messages/api/sendAI"
import { describe, expect, it } from "vitest"

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
      expect(result.data.text.length).toBeGreaterThan(0)
      expect(result.usdCost).toBeGreaterThan(0)
      expect(result.error).toBeNull()
    }
  }, 30000)
})
