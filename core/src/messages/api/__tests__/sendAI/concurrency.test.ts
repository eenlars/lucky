import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("ai", () => ({
  /* deterministic fake generator – *never* hits real network */
  generateText: vi.fn(async ({ messages }) => ({
    text: `[echo] ${messages.at(-1)?.content ?? ""}`,
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  })),
  tool: vi.fn((config: any) => config),
  genObject: vi.fn(),
  stepCountIs: vi.fn((count: number) => ({ type: 'stepCount', count })),
  zodSchema: vi.fn((schema: any) => schema),
}))

afterEach(() => vi.restoreAllMocks())

// TODO: Add test coverage for error handling in sendAI when generateText throws errors
// TODO: Add test for rate limiting behavior when concurrency limit is exceeded
// TODO: Add test for different message roles (system, assistant) not just user
// TODO: Add test for model-specific behavior and fallback mechanisms
describe("sendAI – text mode", () => {
  it("returns success=true on happy path", async () => {
    const res = await sendAI({
      mode: "text",
      messages: [{ role: "user", content: "Ping" }],
    })
    expect(res.success).toBe(true)
    expect(res.data?.text).toMatch(/Ping/)
  })

  it("rejects empty input early", async () => {
    const res = await sendAI({
      mode: "text",
      messages: [{ role: "user", content: " " }],
    })
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/Input must have at least 1 token/)
  })

  // TODO: This test doesn't actually verify concurrency limiting behavior
  // It only checks that all calls succeed, not that they're rate-limited
  it("honours concurrency gate", async () => {
    const calls = 20
    const promises = Array.from({ length: calls }, () =>
      sendAI({
        mode: "text",
        messages: [{ role: "user", content: "x" }],
      })
    )
    const results = await Promise.all(promises)
    expect(results.every((r) => r.success)).toBe(true)
  })
})
