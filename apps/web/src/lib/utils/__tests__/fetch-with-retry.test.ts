import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchWithRetry } from "../fetch-with-retry"

describe("fetchWithRetry", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should return immediately on successful response", async () => {
    const mockFetch = vi.spyOn(globalThis as any, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: "test" }),
    } as any)

    const response = await fetchWithRetry("http://test.com")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(response.ok).toBe(true)
  })

  it("should retry on network failure", async () => {
    const mockFetch = vi
      .spyOn(globalThis as any, "fetch")
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      } as any)

    const response = await fetchWithRetry("http://test.com")

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(response.ok).toBe(true)
  })

  it("should retry on 503 Service Unavailable", async () => {
    const mockFetch = vi
      .spyOn(globalThis as any, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: "Service unavailable" }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      } as any)

    const response = await fetchWithRetry("http://test.com")

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(response.ok).toBe(true)
  })

  it("should not retry on 404 Not Found", async () => {
    const mockFetch = vi.spyOn(globalThis as any, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    } as any)

    const response = await fetchWithRetry("http://test.com")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(response.ok).toBe(false)
    expect(response.status).toBe(404)
  })

  it("should throw after max attempts", async () => {
    const mockFetch = vi.spyOn(globalThis as any, "fetch").mockRejectedValue(new Error("Network error"))

    await expect(fetchWithRetry("http://test.com", {}, 3)).rejects.toThrow("Network error")
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it("should not retry on AbortError", async () => {
    const abortErr = new Error("The operation was aborted")
    ;(abortErr as any).name = "AbortError"

    const mockFetch = vi.spyOn(globalThis as any, "fetch").mockRejectedValueOnce(abortErr)

    await expect(fetchWithRetry("http://test.com", {}, 3)).rejects.toThrow(/aborted/i)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
