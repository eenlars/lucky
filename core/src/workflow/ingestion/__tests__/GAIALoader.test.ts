import { beforeEach, describe, expect, it, vi } from "vitest"
import { GAIALoader } from "../benchmarks/gaia/GAIALoader"

// Mock global fetch
global.fetch = vi.fn()

// Mock GAIALocalLoader to force HTTP path
vi.mock("../benchmarks/gaia/GAIALocalLoader", () => ({
  GAIALocalLoader: {
    isDataAvailable: vi.fn(() => false),
    fetchById: vi.fn(),
    fetchByLevel: vi.fn(),
  },
}))

describe("GAIALoader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch GAIA instance by ID", async () => {
    const mockResponse = {
      rows: [
        {
          row: {
            task_id: "test-task-123",
            Question: "What is the capital of France?",
            Level: 1,
            "Final answer": "Paris",
            file_name: null,
          },
        },
      ],
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await GAIALoader.fetchById("test-task-123")

    // verify fetch was called with correct URL and headers
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://datasets-server.huggingface.co/rows"),
      expect.objectContaining({
        headers: expect.any(Object),
      })
    )

    // check the URL contains expected parameters
    const callArgs = vi.mocked(global.fetch).mock.calls[0]
    const url = callArgs[0] as string
    expect(url).toContain("dataset=gaia-benchmark%2FGAIA")
    expect(url).toContain("split=validation")

    // verify result matches expected structure
    expect(result).toEqual({
      task_id: "test-task-123",
      Question: "What is the capital of France?",
      Level: 1,
      "Final answer": "Paris",
      file_name: undefined,
    })
  })

  it("should handle GAIA instance with file attachment", async () => {
    const mockResponse = {
      rows: [
        {
          row: {
            task_id: "file-task-456",
            Question: "Analyze this spreadsheet and find the total",
            Level: 2,
            "Final answer": "1500",
            file_name: null, // No file to avoid SKIP_INSTANCES_WITH_FILES
          },
        },
      ],
    }

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => ({ rows: [] }), // Empty rows to terminate pagination
      } as Response)

    const result = await GAIALoader.fetchById("file-task-456")

    expect(result.file_name).toBeUndefined()
    expect(result.Level).toBe(2)
    expect(result.task_id).toBe("file-task-456")
  })

  it("should include auth token in headers when provided", async () => {
    const mockResponse = {
      rows: [
        {
          row: {
            task_id: "auth-task",
            Question: "Test question",
            Level: 1,
            "Final answer": "Test answer",
          },
        },
      ],
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const authToken = "hf_test_token_123"
    await GAIALoader.fetchById("auth-task", "validation", authToken)

    // verify auth header was included
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${authToken}`,
        }),
      })
    )
  })

  it("should handle authentication errors", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as Response)

    await expect(GAIALoader.fetchById("test-task")).rejects.toThrow(
      "Authentication required. GAIA is a gated dataset - please provide HF_TOKEN"
    )
  })

  it("should fetch instances by level", async () => {
    const mockResponse = {
      rows: [
        {
          row: {
            task_id: "level3-task-1",
            Question: "Complex question 1",
            Level: 3,
            "Final answer": "Answer 1",
          },
        },
        {
          row: {
            task_id: "level1-task",
            Question: "Simple question",
            Level: 1,
            "Final answer": "Simple answer",
          },
        },
        {
          row: {
            task_id: "level3-task-2",
            Question: "Complex question 2",
            Level: 3,
            "Final answer": "Answer 2",
          },
        },
      ],
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await GAIALoader.fetchByLevel(3, "validation", 2)

    // should only return level 3 instances
    expect(result).toHaveLength(2)
    expect(result.every((instance) => instance.Level === 3)).toBe(true)
    expect(result[0].task_id).toBe("level3-task-1")
    expect(result[1].task_id).toBe("level3-task-2")
  })

  it("should skip task_id 0-0-0-0-0", async () => {
    const mockResponse = {
      rows: [
        {
          row: {
            task_id: "0-0-0-0-0",
            Question: "Should be skipped",
            Level: 1,
          },
        },
        {
          row: {
            task_id: "valid-task",
            Question: "Valid question",
            Level: 1,
            "Final answer": "Valid answer",
          },
        },
      ],
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await GAIALoader.fetchByLevel(1, "validation", 10)

    expect(result).toHaveLength(1)
    expect(result[0].task_id).toBe("valid-task")
  })

  it("should handle pagination when fetching by level", async () => {
    // first batch
    const firstBatch = {
      rows: Array(100)
        .fill(null)
        .map((_, i) => ({
          row: {
            task_id: `level2-task-${i}`,
            Question: `Question ${i}`,
            Level: 2,
            "Final answer": `Answer ${i}`,
          },
        })),
    }

    // second batch with our target level
    const secondBatch = {
      rows: [
        {
          row: {
            task_id: "level1-task",
            Question: "Level 1 question",
            Level: 1,
            "Final answer": "Level 1 answer",
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

    const result = await GAIALoader.fetchByLevel(1, "validation", 1)

    // verify fetch was called twice due to pagination
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(result).toHaveLength(1)
    expect(result[0].Level).toBe(1)
  })

  it("should use test split when specified", async () => {
    const mockResponse = {
      rows: [
        {
          row: {
            task_id: "test-task",
            Question: "Test question",
            Level: 1,
            "Final answer": "Test answer",
          },
        },
      ],
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    await GAIALoader.fetchById("test-task", "test")

    // verify fetch was called with test split
    const callArgs = vi.mocked(global.fetch).mock.calls[0]
    const url = callArgs[0] as string
    expect(url).toContain("split=test")
  })

  it("should throw error when instance is not found", async () => {
    const mockResponse = {
      rows: [],
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    await expect(GAIALoader.fetchById("non-existent")).rejects.toThrow(
      "GAIA instance non-existent not found in split validation"
    )
  })

  it("should handle HTTP errors", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "Internal Server Error",
      headers: {
        entries: () => [],
      },
    } as unknown as Response)

    await expect(GAIALoader.fetchById("test-task")).rejects.toThrow(
      "Failed to fetch GAIA instance test-task: Error: HTTP error! status: 500"
    )
  })

  it("should handle network errors", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network failure"))

    await expect(GAIALoader.fetchById("test-task")).rejects.toThrow(
      "Failed to fetch GAIA instance test-task: Error: Network failure"
    )
  })
})
