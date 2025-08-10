import { beforeEach, describe, expect, it, vi } from "vitest"
import { SWEBenchLoader } from "../benchmarks/swe/SWEBenchLoader"

// mock global fetch
global.fetch = vi.fn()

describe("SWEBenchLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch SWE-bench instance by ID", async () => {
    const mockResponse = {
      rows: [
        {
          row: {
            instance_id: "test-instance",
            problem_statement: "Test problem",
            text: "Test issue text",
            repo: "test/repo",
            base_commit: "commit123",
            patch: "test patch",
            test_patch: "test test_patch",
          },
        },
      ],
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await SWEBenchLoader.fetchById("test-instance")

    // verify fetch was called with correct URL components
    const fetchCall = vi.mocked(global.fetch).mock.calls[0]
    expect(fetchCall[0]).toContain(
      "https://datasets-server.huggingface.co/rows"
    )
    expect(fetchCall[0]).toContain("dataset=princeton-nlp%2FSWE-bench")
    expect(fetchCall[0]).toContain("split=test")

    // verify result matches expected structure
    expect(result).toEqual({
      instance_id: "test-instance",
      problem_statement: "Test problem",
      text: "Test issue text",
      repo: "test/repo",
      base_commit: "commit123",
      patch: "test patch",
      test_patch: "test test_patch",
    })
  })

  it("should handle pagination when instance is not in first batch", async () => {
    // first batch without our instance
    const firstBatch = {
      rows: Array(100)
        .fill(null)
        .map((_, i) => ({
          row: { instance_id: `other-instance-${i}` },
        })),
    }

    // second batch with our instance
    const secondBatch = {
      rows: [
        {
          row: {
            instance_id: "target-instance",
            problem_statement: "Found it!",
            text: "Issue text",
            repo: "test/repo",
            base_commit: "abc123",
            patch: "patch content",
            test_patch: null,
          },
        },
      ],
    }

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => firstBatch,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => secondBatch,
      } as Response)

    const result = await SWEBenchLoader.fetchById("target-instance")

    // verify fetch was called twice
    expect(global.fetch).toHaveBeenCalledTimes(2)

    // verify result
    expect(result.instance_id).toBe("target-instance")
    expect(result.problem_statement).toBe("Found it!")
  })

  it("should throw error when instance is not found", async () => {
    const mockResponse = {
      rows: [],
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    await expect(SWEBenchLoader.fetchById("non-existent")).rejects.toThrow(
      "SWE-bench instance non-existent not found in split test"
    )
  })

  it("should handle HTTP errors", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    await expect(SWEBenchLoader.fetchById("test-instance")).rejects.toThrow(
      "Failed to fetch SWE-bench instance test-instance: Error: HTTP error! status: 500"
    )
  })

  it("should handle network errors", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network failure"))

    await expect(SWEBenchLoader.fetchById("test-instance")).rejects.toThrow(
      "Failed to fetch SWE-bench instance test-instance: Error: Network failure"
    )
  })

  it("should use different splits", async () => {
    const mockResponse = {
      rows: [
        {
          row: {
            instance_id: "dev-instance",
            problem_statement: "Dev problem",
            text: "Dev text",
            repo: "dev/repo",
            base_commit: "dev123",
            patch: "dev patch",
            test_patch: null,
          },
        },
      ],
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    await SWEBenchLoader.fetchById("dev-instance", "dev")

    // verify fetch was called with dev split
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("split=dev"),
      expect.anything()
    )
  })

  it("should handle null test_patch field", async () => {
    const mockResponse = {
      rows: [
        {
          row: {
            instance_id: "test-instance",
            problem_statement: "Test problem",
            text: "Test text",
            repo: "test/repo",
            base_commit: "commit123",
            patch: "patch",
            test_patch: undefined, // missing field
          },
        },
      ],
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await SWEBenchLoader.fetchById("test-instance")

    // verify test_patch is null when field is missing
    expect(result.test_patch).toBe(null)
  })
})
