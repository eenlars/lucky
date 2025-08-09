import { describe, expect, it } from "vitest"
import { hashGoldenTrace } from "../utils/goldenTrace"

describe("golden trace hashing", () => {
  it("produces stable hash ignoring timestamps and ids", () => {
    const traceA = {
      id: "abc123",
      timestamp: Date.now(),
      steps: [
        { name: "start", time: 1731111111111 },
        { name: "end", time: 1731111111222 },
      ],
      payload: { value: 42, note: "ok" },
    }

    const traceB = {
      id: "xyz999",
      timestamp: Date.now() + 1000,
      steps: [
        { name: "start", time: 1732111111111 },
        { name: "end", time: 1732111111222 },
      ],
      payload: { value: 42, note: "ok" },
    }

    const a = hashGoldenTrace(traceA)
    const b = hashGoldenTrace(traceB)
    expect(a).toBe(b)
  })
})
