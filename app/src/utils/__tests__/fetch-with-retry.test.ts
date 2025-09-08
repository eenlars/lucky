import { describe, expect, it, vi } from "vitest"
import { fetchWithRetry } from "../fetch-with-retry"

describe("fetchWithRetry", () => {
  it("should return immediately on successful response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: "test" }),
    })
    global.fetch = mockFetch as any

    const response = await fetchWithRetry("http://test.com")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(response.ok).toBe(true)
  })

  it("should retry on network failure", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      })
    global.fetch = mockFetch as any

    const response = await fetchWithRetry("http://test.com")

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(response.ok).toBe(true)
  })

  it("should retry on 503 Service Unavailable", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: "Service unavailable" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      })
    global.fetch = mockFetch as any

    const response = await fetchWithRetry("http://test.com")

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(response.ok).toBe(true)
  })

  it("should not retry on 404 Not Found", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    })
    global.fetch = mockFetch as any

    const response = await fetchWithRetry("http://test.com")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(response.ok).toBe(false)
    expect(response.status).toBe(404)
  })

  it("should throw after max attempts", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"))
    global.fetch = mockFetch as any

    await expect(fetchWithRetry("http://test.com", {}, 3)).rejects.toThrow(
      "Network error"
    )
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })
})
