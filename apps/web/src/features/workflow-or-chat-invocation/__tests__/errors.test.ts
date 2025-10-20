import { describe, expect, it } from "vitest"
import { InvalidWorkflowInputError, MissingApiKeysError, NoEnabledModelsError } from "../lib/errors/workflowInputError"

describe("MissingApiKeysError", () => {
  it("should create error with correct message and properties", () => {
    const missingKeys = ["OPENAI_API_KEY", "GROQ_API_KEY"]
    const missingProviders = ["OpenAI", "Groq"]

    const error = new MissingApiKeysError(missingKeys, missingProviders)

    expect(error.name).toBe("MissingApiKeysError")
    expect(error.message).toBe("Missing required API keys: OpenAI, Groq")
    expect(error.missingKeys).toEqual(missingKeys)
    expect(error.missingProviders).toEqual(missingProviders)
    expect(error).toBeInstanceOf(Error)
  })

  it("should handle single missing key", () => {
    const error = new MissingApiKeysError(["OPENAI_API_KEY"], ["OpenAI"])

    expect(error.message).toBe("Missing required API keys: OpenAI")
    expect(error.missingKeys).toEqual(["OPENAI_API_KEY"])
    expect(error.missingProviders).toEqual(["OpenAI"])
  })

  it("should handle empty arrays", () => {
    const error = new MissingApiKeysError([], [])

    expect(error.message).toBe("Missing required API keys: ")
    expect(error.missingKeys).toEqual([])
    expect(error.missingProviders).toEqual([])
  })
})

describe("NoEnabledModelsError", () => {
  it("should create error with correct message and provider", () => {
    const error = new NoEnabledModelsError("openai")

    expect(error.name).toBe("NoEnabledModelsError")
    expect(error.message).toBe("No enabled models found for provider: openai")
    expect(error.provider).toBe("openai")
    expect(error).toBeInstanceOf(Error)
  })

  it("should handle different providers", () => {
    const error = new NoEnabledModelsError("groq")

    expect(error.message).toBe("No enabled models found for provider: groq")
    expect(error.provider).toBe("groq")
  })

  it("should handle 'all' provider", () => {
    const error = new NoEnabledModelsError("all")

    expect(error.message).toBe("No enabled models found for provider: all")
    expect(error.provider).toBe("all")
  })
})

describe("InvalidWorkflowInputError", () => {
  it("should create error with correct code and message", () => {
    const code = 400
    const message = "Invalid input provided"

    const error = new InvalidWorkflowInputError(code, message)

    expect(error.name).toBe("InvalidWorkflowInputError")
    expect(error.message).toBe(message)
    expect(error.code).toBe(code)
    expect(error).toBeInstanceOf(Error)
  })

  it("should handle different error codes", () => {
    const error = new InvalidWorkflowInputError(403, "Access denied")

    expect(error.code).toBe(403)
    expect(error.message).toBe("Access denied")
  })

  it("should handle complex error messages", () => {
    const message = "Loading workflows from file paths is not allowed. Please use workflow IDs from your dashboard."
    const error = new InvalidWorkflowInputError(403, message)

    expect(error.message).toBe(message)
    expect(error.code).toBe(403)
  })
})
