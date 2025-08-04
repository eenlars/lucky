import { describe, expect, it, vi } from "vitest"
import { fetcher } from "../fetcher"

// Mock the global fetch function
const mockFetch = vi.fn()
global.fetch = mockFetch

describe("resilient fetcher", () => {
  it("should handle invalid urls", async () => {
    await expect(fetcher("not-a-url")).rejects.toThrow("invalid url")
  })

  it("should return status and headers info", async () => {
    // Mock successful response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      json: async () => ({ id: 1, title: "Test Post" }),
      text: async () => "Test content",
    })

    const result = await fetcher("https://jsonplaceholder.typicode.com/posts/1")

    expect(result.status).toBe(200)
    expect(result.statusText).toBe("OK")
    expect(result.headers).toBeDefined()
  })

  it("should handle http errors gracefully", async () => {
    // Mock 404 response
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: new Headers(),
      json: async () => ({}),
      text: async () => "Not Found",
    })

    const result = await fetcher(
      "https://jsonplaceholder.typicode.com/posts/999999"
    )

    expect(result.status).toBe(404)
    // should not throw, let caller decide what to do with status
  })

  it("should parse json responses", async () => {
    // Mock JSON response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      json: async () => ({ id: 1, title: "Test Post" }),
      text: async () => JSON.stringify({ id: 1, title: "Test Post" }),
    })

    const result = await fetcher("https://jsonplaceholder.typicode.com/posts/1")
    const data = await result.json()

    expect(data).toHaveProperty("id")
    expect(data).toHaveProperty("title")
  })

  it("should parse text responses", async () => {
    // Mock HTML response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      json: async () => ({}),
      text: async () => "<html><body>Test</body></html>",
    })

    const result = await fetcher("https://example.com")
    const html = await result.text()

    expect(html).toContain("<html>")
  })
})
