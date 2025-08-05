import { beforeEach, describe, expect, it, vi } from "vitest"
import { WebArenaLoader } from "../benchmarks/webarena/WebArenaLoader"

// mock global fetch
global.fetch = vi.fn()

describe("WebArenaLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch WebArena instance by ID", async () => {
    const mockTasks = [
      {
        task_id: 42,
        sites: ["shopping"],
        intent_template: "Find product {{name}}",
        intent: "Find product laptop",
        require_login: false,
        eval: {
          eval_types: ["string_match"],
          reference_answers: { exact_match: "Dell Laptop" },
        },
      },
      {
        task_id: 43,
        sites: ["reddit"],
        intent_template: "Post about {{topic}}",
        intent: "Post about technology",
        require_login: true,
        eval: {
          eval_types: ["string_match"],
          reference_answers: { exact_match: "Success" },
        },
      },
    ]

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockTasks),
    } as Response)

    const result = await WebArenaLoader.fetchById(42)

    // verify fetch was called with correct URL
    expect(global.fetch).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/web-arena-x/webarena/main/config_files/test.raw.json",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        cache: "force-cache",
      })
    )

    // verify result matches expected structure
    expect(result).toEqual({
      task_id: 42,
      sites: ["shopping"],
      intent_template: "Find product {{name}}",
      intent: "Find product laptop",
      require_login: false,
      eval: {
        eval_types: ["string_match"],
        reference_answers: {
          exact_match: "Dell Laptop",
        },
      },
    })
  })

  it("should fetch WebArena tasks as WorkflowIO", async () => {
    const mockTasks = [
      {
        task_id: 1,
        sites: ["shopping", "map"],
        intent_template: "Template 1",
        intent: "Find the best restaurant near CMU",
        require_login: true,
        eval: {
          eval_types: ["string_match"],
          reference_answers: { exact_match: "Primanti Bros" },
        },
      },
      {
        task_id: 2,
        sites: ["reddit"],
        intent_template: "Template 2",
        intent: "Create a post about AI",
        require_login: false,
        eval: {
          eval_types: ["fuzzy_match"],
          reference_answers: { fuzzy_match: ["success", "posted", "created"] },
        },
      },
    ]

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockTasks),
    } as Response)

    const result = await WebArenaLoader.fetchAsWorkflowIO(2)

    expect(result).toHaveLength(2)

    // check first workflow
    expect(result[0].workflowInput).toContain(
      "Find the best restaurant near CMU"
    )
    expect(result[0].workflowInput).toContain("Sites involved: shopping, map")
    expect(result[0].workflowInput).toContain("Requires login: Yes")
    expect(result[0].expectedWorkflowOutput).toContain("string_match")
    expect(result[0].expectedWorkflowOutput).toContain("Primanti Bros")

    // check second workflow
    expect(result[1].workflowInput).toContain("Create a post about AI")
    expect(result[1].workflowInput).toContain("Sites involved: reddit")
    expect(result[1].workflowInput).toContain("Requires login: No")
    expect(result[1].expectedWorkflowOutput).toContain("fuzzy_match")
    expect(result[1].expectedWorkflowOutput).toContain("success")
  })

  it("should filter tasks by sites", async () => {
    const mockTasks = [
      {
        task_id: 1,
        sites: ["shopping"],
        intent_template: "Template 1",
        intent: "Shop for items",
        require_login: false,
        eval: {
          eval_types: ["string_match"],
          reference_answers: { exact_match: "Success" },
        },
      },
      {
        task_id: 2,
        sites: ["reddit"],
        intent_template: "Template 2",
        intent: "Post on reddit",
        require_login: true,
        eval: {
          eval_types: ["string_match"],
          reference_answers: { exact_match: "Posted" },
        },
      },
      {
        task_id: 3,
        sites: ["shopping", "map"],
        intent_template: "Template 3",
        intent: "Shop and navigate",
        require_login: false,
        eval: {
          eval_types: ["string_match"],
          reference_answers: { exact_match: "Done" },
        },
      },
    ]

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockTasks),
    } as Response)

    const result = await WebArenaLoader.fetchAsWorkflowIO(10, ["shopping"])

    // should only return tasks that include shopping site
    expect(result).toHaveLength(2)
    expect(result[0].workflowInput).toContain("Shop for items")
    expect(result[1].workflowInput).toContain("Shop and navigate")
  })

  it("should fetch tasks by specific sites", async () => {
    const mockTasks = [
      {
        task_id: 10,
        sites: ["reddit"],
        intent_template: "Template",
        intent: "Post about topic",
        require_login: true,
        eval: {
          eval_types: ["string_match"],
          reference_answers: { exact_match: "Success" },
        },
      },
      {
        task_id: 11,
        sites: ["shopping"],
        intent_template: "Template",
        intent: "Buy product",
        require_login: false,
        eval: {
          eval_types: ["string_match"],
          reference_answers: { exact_match: "Purchased" },
        },
      },
      {
        task_id: 12,
        sites: ["reddit", "shopping"],
        intent_template: "Template",
        intent: "Compare and post",
        require_login: true,
        eval: {
          eval_types: ["string_match"],
          reference_answers: { exact_match: "Compared" },
        },
      },
    ]

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockTasks),
    } as Response)

    const result = await WebArenaLoader.fetchBySites(["reddit"], 10)

    expect(result).toHaveLength(2)
    expect(result[0].task_id).toBe(10)
    expect(result[1].task_id).toBe(12)
    expect(result.every((task) => task.sites.includes("reddit"))).toBe(true)
  })

  it("should handle tasks with multiple evaluation types", async () => {
    const mockTasks = [
      {
        task_id: 100,
        sites: ["gitlab"],
        intent_template: "Create repository",
        intent: "Create a new repo called test-repo",
        require_login: true,
        eval: {
          eval_types: ["string_match", "fuzzy_match"],
          reference_answers: {
            exact_match: "test-repo",
            must_include: ["repository", "created"],
            fuzzy_match: ["success", "done", "completed"],
          },
        },
      },
    ]

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockTasks),
    } as Response)

    const result = await WebArenaLoader.fetchAsWorkflowIO(1)

    expect(result).toHaveLength(1)
    expect(result[0].expectedWorkflowOutput).toContain(
      "string_match, fuzzy_match"
    )
    expect(result[0].expectedWorkflowOutput).toContain("test-repo")
    expect(result[0].expectedWorkflowOutput).toContain("repository")
    expect(result[0].expectedWorkflowOutput).toContain("success")
  })

  it("should throw error when task is not found", async () => {
    const mockTasks = [
      {
        task_id: 1,
        sites: ["shopping"],
        intent_template: "Template",
        intent: "Task 1",
        require_login: false,
        eval: {
          eval_types: ["string_match"],
          reference_answers: { exact_match: "Success" },
        },
      },
      {
        task_id: 2,
        sites: ["reddit"],
        intent_template: "Template",
        intent: "Task 2",
        require_login: true,
        eval: {
          eval_types: ["string_match"],
          reference_answers: { exact_match: "Posted" },
        },
      },
    ]

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockTasks),
    } as Response)

    await expect(WebArenaLoader.fetchById(999)).rejects.toThrow(
      "WebArena task 999 not found"
    )
  })

  it("should handle HTTP errors", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    await expect(WebArenaLoader.fetchById(1)).rejects.toThrow(
      "Failed to fetch WebArena task 1: Error: HTTP error! status: 404"
    )
  })

  it("should handle network errors with fallback to mock data", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("ECONNREFUSED"))

    const result = await WebArenaLoader.fetchById(123)

    expect(result.task_id).toBe(123)
    expect(result.intent).toContain("Mock task intent for task 123")
    expect(result.sites).toEqual(["shopping", "mock_site"])
    expect(result.eval.reference_answers.exact_match).toBe(
      "Mock answer for task 123"
    )
  })

  it("should handle malformed JSON gracefully", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => "invalid json",
    } as Response)

    await expect(WebArenaLoader.fetchAsWorkflowIO(10)).rejects.toThrow(
      "Failed to convert WebArena to WorkflowIO"
    )
  })

  it("should respect limit parameter", async () => {
    const mockTasks = Array(10)
      .fill(null)
      .map((_, i) => ({
        task_id: i,
        sites: ["shopping"],
        intent_template: `Template ${i}`,
        intent: `Task ${i}`,
        require_login: false,
        eval: {
          eval_types: ["string_match"],
          reference_answers: {
            exact_match: `Result ${i}`,
          },
        },
      }))

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockTasks),
    } as Response)

    const result = await WebArenaLoader.fetchAsWorkflowIO(5)

    expect(result).toHaveLength(5)
    expect(result[0].workflowInput).toContain("Task 0")
    expect(result[4].workflowInput).toContain("Task 4")
  })

  it("should handle empty dataset", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => "",
    } as Response)

    await expect(WebArenaLoader.fetchAsWorkflowIO(10)).rejects.toThrow(
      "No WebArena tasks found"
    )
  })
})
