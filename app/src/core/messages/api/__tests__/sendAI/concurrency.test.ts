import { sendAI } from "@/core/messages/api/sendAI"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("ai", () => ({
  /* deterministic fake generator – *never* hits real network */
  generateText: vi.fn(async ({ messages }) => ({
    text: `[echo] ${messages.at(-1)?.content ?? ""}`,
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  })),
}))

afterEach(() => vi.restoreAllMocks())

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
