import { describe, expect, it } from "vitest"
import { EnhancedError, enhanceError } from "../enhanced-error"

describe("EnhancedError", () => {
  it("creates error with all fields", () => {
    const error = new EnhancedError({
      title: "Test Error",
      message: "Something went wrong",
      action: "Try again",
      debug: {
        code: "TEST_ERROR",
        context: { foo: "bar" },
        timestamp: "2025-10-08T00:00:00.000Z",
        traceId: "trace-123",
      },
      docsUrl: "/docs/test",
      retryable: true,
      retryStrategy: "manual",
    })

    expect(error.title).toBe("Test Error")
    expect(error.userMessage).toBe("Something went wrong")
    expect(error.action).toBe("Try again")
    expect(error.debug.code).toBe("TEST_ERROR")
    expect(error.docsUrl).toBe("/docs/test")
    expect(error.retryable).toBe(true)
    expect(error.retryStrategy).toBe("manual")
  })

  it("serializes to JSON correctly", () => {
    const error = new EnhancedError({
      title: "Test Error",
      message: "Something went wrong",
      action: "Try again",
      debug: {
        code: "TEST_ERROR",
        context: { foo: "bar" },
        timestamp: "2025-10-08T00:00:00.000Z",
      },
      retryable: true,
    })

    const json = error.toJSON()
    expect(json.name).toBe("EnhancedError")
    expect(json.title).toBe("Test Error")
    expect(json.message).toBe("Something went wrong")
    expect(json.debug.code).toBe("TEST_ERROR")
  })

  it("formats console string with key info", () => {
    const error = new EnhancedError({
      title: "Test Error",
      message: "Something went wrong",
      action: "Try again",
      debug: {
        code: "TEST_ERROR",
        context: {},
        timestamp: "2025-10-08T00:00:00.000Z",
        traceId: "trace-123",
      },
      docsUrl: "/docs/test",
      retryable: true,
      retryStrategy: "exponential",
    })

    const str = error.toConsoleString()
    expect(str).toContain("❌ Test Error")
    expect(str).toContain("Problem: Something went wrong")
    expect(str).toContain("Action: Try again")
    expect(str).toContain("Docs: /docs/test")
    expect(str).toContain("Retryable: Yes (exponential)")
    expect(str).toContain("Code: TEST_ERROR")
    expect(str).toContain("Trace: trace-123")
  })
})

describe("enhanceError", () => {
  it("returns EnhancedError as-is", () => {
    const original = new EnhancedError({
      title: "Test",
      message: "Test message",
      action: "Test action",
      debug: { code: "TEST", context: {}, timestamp: new Date().toISOString() },
      retryable: false,
    })

    const enhanced = enhanceError(original, "NEW_CODE")
    expect(enhanced).toBe(original)
  })

  it("converts standard Error to EnhancedError", () => {
    const original = new Error("Something failed")
    const enhanced = enhanceError(original, "GENERIC_ERROR", "trace-xyz")

    expect(enhanced).toBeInstanceOf(EnhancedError)
    expect(enhanced.userMessage).toBe("Something failed")
    expect(enhanced.debug.code).toBe("GENERIC_ERROR")
    expect(enhanced.debug.traceId).toBe("trace-xyz")
  })

  it("converts unknown values to EnhancedError", () => {
    const enhanced = enhanceError("Unknown error string", "UNKNOWN_ERROR")

    expect(enhanced).toBeInstanceOf(EnhancedError)
    expect(enhanced.userMessage).toBe("Unknown error string")
    expect(enhanced.debug.code).toBe("UNKNOWN_ERROR")
  })
})
