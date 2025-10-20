import { describe, expect, it } from "vitest"
import { normalizeError } from "../errors"

describe("normalizeError", () => {
  describe("responseBodySnippet parsing", () => {
    it("should parse error message from responseBodySnippet when responseBody is missing", () => {
      const mockError = {
        name: "AI_APICallError",
        message: "API call failed",
        statusCode: 400,
        url: "https://openrouter.ai/api/v1/chat/completions",
        responseHeaders: {
          "content-type": "application/json",
        },
        responseBodySnippet: JSON.stringify({
          error: {
            message: "openrouter#meta-llama/llama-4-maverick:free is not a valid model ID",
            code: 400,
          },
          user_id: "user_test123",
        }),
      }

      const result = normalizeError(mockError)

      expect(result.message).toBe("openrouter#meta-llama/llama-4-maverick:free is not a valid model ID")
      expect(result.debug.provider).toBe("OpenRouter")
      expect(result.debug.statusCode).toBe(400)
      expect(result.debug.responseBodySnippet).toContain("is not a valid model ID")
    })

    it("should prefer responseBody over responseBodySnippet", () => {
      const mockError = {
        name: "AI_APICallError",
        statusCode: 400,
        url: "https://openrouter.ai/api/v1/chat/completions",
        responseBody: JSON.stringify({
          error: { message: "Error from responseBody" },
        }),
        responseBodySnippet: JSON.stringify({
          error: { message: "Error from responseBodySnippet" },
        }),
      }

      const result = normalizeError(mockError)

      expect(result.message).toBe("Error from responseBody")
    })

    it("should handle OpenAI error format from responseBodySnippet", () => {
      const mockError = {
        name: "AI_APICallError",
        statusCode: 401,
        url: "https://api.openai.com/v1/chat/completions",
        responseBodySnippet: JSON.stringify({
          error: {
            message: "Invalid API key provided",
            type: "invalid_request_error",
          },
        }),
      }

      const result = normalizeError(mockError)

      expect(result.message).toContain("Authentication failed")
      expect(result.debug.provider).toBe("OpenAI")
    })

    it("should handle alternative message format from responseBodySnippet", () => {
      const mockError = {
        name: "AI_APICallError",
        statusCode: 500,
        responseBodySnippet: JSON.stringify({
          message: "Internal server error",
        }),
      }

      const result = normalizeError(mockError)

      expect(result.message).toContain("Service is temporarily unavailable")
    })

    it("should fall back gracefully when responseBodySnippet is malformed JSON", () => {
      const mockError = {
        name: "AI_APICallError",
        message: "Original error message",
        statusCode: 400,
        responseBodySnippet: "This is not valid JSON {{{",
      }

      const result = normalizeError(mockError)

      expect(result.message).toBe("Original error message")
      expect(result.debug.responseBodySnippet).toBe("This is not valid JSON {{{")
    })

    it("should detect API call error by responseBodySnippet presence", () => {
      const mockError = {
        statusCode: 400,
        responseBodySnippet: JSON.stringify({
          error: { message: "Test error" },
        }),
      }

      const result = normalizeError(mockError)

      expect(result.debug.name).toBe("APICallError")
      expect(result.message).toBe("Test error")
    })
  })
})
