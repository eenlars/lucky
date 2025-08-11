import { beforeEach, describe, expect, it, vi } from "vitest"
import { IngestionLayer } from "../IngestionLayer"
import { SWEBenchLoader } from "../benchmarks/swe/SWEBenchLoader"
import type { SWEBenchInput, SWEBenchInstance } from "../ingestion.types"

// mock the SWEBenchLoader
vi.mock("../SWEBenchLoader")

describe("IngestionLayer - SWE-bench", () => {
  const mockInstance: SWEBenchInstance = {
    instance_id: "django__django-11099",
    problem_statement: "ValueError when accessing admin list page",
    text: "Full issue description with stack trace and reproduction steps...",
    repo: "django/django",
    base_commit: "abc123def456",
    patch:
      "diff --git a/django/admin/views.py b/django/admin/views.py\n--- a/django/admin/views.py\n+++ b/django/admin/views.py\n@@ -123,7 +123,7 @@\n-    old_code\n+    new_code",
    test_patch: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should convert SWE-bench evaluation to WorkflowIO", async () => {
    // mock the fetchById method
    vi.mocked(SWEBenchLoader.fetchById).mockResolvedValue(mockInstance)

    const evaluation: SWEBenchInput = {
      type: "swebench",
      goal: "Fix the bug described in this SWE-bench instance",
      workflowId: "test-workflow-id",
    }

    const result = await IngestionLayer.convert(evaluation)

    // verify SWEBenchLoader was called with correct parameters
    expect(SWEBenchLoader.fetchById).toHaveBeenCalledWith(
      "django__django-11099"
    )

    // verify result structure
    expect(result).toHaveLength(1)
    const workflowCase = result[0]

    // verify workflow input contains all expected information
    expect(workflowCase.workflowInput).toContain(evaluation.goal)
    expect(workflowCase.workflowInput).toContain(
      `Repository: ${mockInstance.repo}`
    )
    expect(workflowCase.workflowInput).toContain(
      `Base commit: ${mockInstance.base_commit}`
    )
    expect(workflowCase.workflowInput).toContain(
      `Problem statement:\n${mockInstance.problem_statement}`
    )
    expect(workflowCase.workflowInput).toContain(
      `Full issue text:\n${mockInstance.text}`
    )

    // verify workflow output is the patch
    expect(workflowCase.workflowOutput).toBe(mockInstance.patch)
  })

  it("should handle errors when fetching SWE-bench instance", async () => {
    // mock fetchById to throw an error
    vi.mocked(SWEBenchLoader.fetchById).mockRejectedValue(
      new Error("SWE-bench instance test-instance not found in split test")
    )

    const evaluation: SWEBenchInput = {
      type: "swebench",
      goal: "Fix the bug",
      workflowId: "test-workflow-id",
    }

    // expect the conversion to throw
    await expect(IngestionLayer.convert(evaluation)).rejects.toThrow(
      "failed to convert SWE-bench evaluation: SWE-bench instance test-instance not found in split test"
    )
  })

  it("should handle network errors gracefully", async () => {
    // mock fetchById to throw a network error
    vi.mocked(SWEBenchLoader.fetchById).mockRejectedValue(
      new Error("Network error: Failed to fetch")
    )

    const evaluation: SWEBenchInput = {
      type: "swebench",
      goal: "Fix the bug",
      workflowId: "test-workflow-id",
    }

    // expect the conversion to throw with proper error message
    await expect(IngestionLayer.convert(evaluation)).rejects.toThrow(
      "failed to convert SWE-bench evaluation: Network error: Failed to fetch"
    )
  })
})
