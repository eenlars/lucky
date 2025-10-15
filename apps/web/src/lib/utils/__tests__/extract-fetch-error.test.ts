import { describe, expect, it } from "vitest"
import { extractFetchError } from "../extract-fetch-error"

describe("extractFetchError", () => {
  it("should extract error message from JSON response", async () => {
    const response = {
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ error: "Database connection failed" }),
    } as Response

    const result = await extractFetchError(response)
    expect(result).toBe("Database connection failed")
  })

  it("should extract message field from JSON response", async () => {
    const response = {
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ message: "Invalid input provided" }),
    } as Response

    const result = await extractFetchError(response)
    expect(result).toBe("Invalid input provided")
  })

  it("should prefer error field over message field", async () => {
    const response = {
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ error: "Validation failed", message: "Something else" }),
    } as Response

    const result = await extractFetchError(response)
    expect(result).toBe("Validation failed")
  })

  it("should fall back to status text when JSON parsing fails", async () => {
    const response = {
      status: 503,
      statusText: "Service Unavailable",
      json: async () => {
        throw new Error("Invalid JSON")
      },
    } as unknown as Response

    const result = await extractFetchError(response)
    expect(result).toBe("Service Unavailable")
  })

  it("should fall back to HTTP status code when status text is empty", async () => {
    const response = {
      status: 404,
      statusText: "",
      json: async () => {
        throw new Error("Invalid JSON")
      },
    } as unknown as Response

    const result = await extractFetchError(response)
    expect(result).toBe("HTTP 404")
  })

  it("should handle JSON response without error or message", async () => {
    const response = {
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ data: null }),
    } as Response

    const result = await extractFetchError(response)
    expect(result).toBe("Internal Server Error")
  })
})
