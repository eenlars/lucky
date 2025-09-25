import { GAIALoader } from "@core/evaluation/benchmarks/gaia/GAIALoader"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import { CONFIG } from "@runtime/settings/constants"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { IngestionLayer } from "../IngestionLayer"

describe("IngestionLayer - GAIA", () => {
  beforeEach(() => {
    ;(CONFIG as any).ingestion = (CONFIG as any).ingestion || { taskLimit: 10 }
    ;(CONFIG as any).logging = (CONFIG as any).logging || {
      level: "info",
      override: { Setup: false },
    }
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it("should convert GAIA evaluation to WorkflowIO", async () => {
    const mockGAIAInstances = [
      {
        task_id: "test-123",
        Question: "What is 2 + 2?",
        Level: 1,
        "Final answer": "4",
        file_name: undefined,
      },
    ]

    const spy = vi.spyOn(GAIALoader, "fetchByLevel").mockResolvedValueOnce(mockGAIAInstances as any)

    const evaluation: EvaluationInput = {
      type: "gaia",
      taskId: "ignored-by-convert",
      goal: "Solve this GAIA benchmark task",
      workflowId: "workflow-123",
    }

    const result = await IngestionLayer.convert(evaluation)

    expect(result).toHaveLength(1)
    expect(result[0].workflowInput).toContain("Solve this GAIA benchmark task")
    expect(result[0].workflowInput).toContain("Task ID: test-123")
    expect(result[0].workflowInput).toContain("Level: 1")
    expect(result[0].workflowInput).toContain("What is 2 + 2?")
    expect(result[0].workflowOutput.output).toBe("4")

    // verify GAIALoader was called once
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it("should handle GAIA instance with file attachment", async () => {
    const mockGAIAInstances = [
      {
        task_id: "file-task",
        Question: "Analyze the attached spreadsheet",
        Level: 2,
        "Final answer": "Total: 1500",
        file_name: "data.xlsx",
      },
    ]

    vi.spyOn(GAIALoader, "fetchByLevel").mockResolvedValueOnce(mockGAIAInstances as any)

    const evaluation: EvaluationInput = {
      type: "gaia",
      taskId: "file-task",
      goal: "Process GAIA task with file",
      workflowId: "workflow-456",
    }

    const result = await IngestionLayer.convert(evaluation)

    expect(result[0].workflowInput).toContain("attached file: data.xlsx")
    expect(result[0].workflowInput).toContain("The file content should be processed")
  })

  it("should use specified split", async () => {
    const mockGAIAInstances = [
      {
        task_id: "test-split",
        Question: "Test question",
        Level: 1,
        "Final answer": "Test answer",
      },
    ]

    const spy = vi.spyOn(GAIALoader, "fetchByLevel").mockResolvedValueOnce(mockGAIAInstances as any)

    const evaluation: EvaluationInput = {
      type: "gaia",
      taskId: "test-split",
      split: "test",
      goal: "Use test split",
      workflowId: "workflow-789",
    }

    await IngestionLayer.convert(evaluation)

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it("should pass HF_TOKEN when available", async () => {
    process.env.HF_TOKEN = "test-token-123"

    const mockGAIAInstances = [
      {
        task_id: "auth-task",
        Question: "Auth test",
        Level: 1,
        "Final answer": "Answer",
      },
    ]

    const spy = vi.spyOn(GAIALoader, "fetchByLevel").mockResolvedValueOnce(mockGAIAInstances as any)

    const evaluation: EvaluationInput = {
      type: "gaia",
      taskId: "auth-task",
      goal: "Test with auth",
      workflowId: "workflow-auth",
    }

    await IngestionLayer.convert(evaluation)

    expect(spy).toHaveBeenCalledWith(1, "validation", expect.any(Number), "test-token-123")
  })

  it("should handle GAIA instance without final answer", async () => {
    const mockGAIAInstances = [
      {
        task_id: "no-answer",
        Question: "Question without answer",
        Level: 3,
        file_name: undefined,
      },
    ]

    vi.spyOn(GAIALoader, "fetchByLevel").mockResolvedValueOnce(mockGAIAInstances as any)

    const evaluation: EvaluationInput = {
      type: "gaia",
      taskId: "no-answer",
      goal: "Handle missing answer",
      workflowId: "workflow-999",
    }

    const result = await IngestionLayer.convert(evaluation)

    expect(result[0].workflowOutput.output).toBe("")
  })

  it("should handle different difficulty levels", async () => {
    const mockGAIAInstances = [
      {
        task_id: "level-3-task",
        Question: "Complex multi-step question",
        Level: 3,
        "Final answer": "Complex answer",
      },
    ]

    vi.spyOn(GAIALoader, "fetchByLevel").mockResolvedValueOnce(mockGAIAInstances as any)

    const evaluation: EvaluationInput = {
      type: "gaia",
      taskId: "level-3-task",
      level: 3,
      goal: "Solve level 3 task",
      workflowId: "workflow-level3",
    }

    const result = await IngestionLayer.convert(evaluation)

    expect(result[0].workflowInput).toContain("Level: 3")
  })

  it("should handle errors from GAIALoader", async () => {
    vi.spyOn(GAIALoader, "fetchByLevel").mockRejectedValueOnce(new Error("Failed to fetch GAIA instance"))

    const evaluation: EvaluationInput = {
      type: "gaia",
      taskId: "error-task",
      goal: "Error test",
      workflowId: "workflow-error",
    }

    await expect(IngestionLayer.convert(evaluation)).rejects.toThrow(
      "failed to convert GAIA evaluation: Failed to fetch GAIA instance"
    )
  })

  it("should return a fallback case on authentication errors", async () => {
    vi.spyOn(GAIALoader, "fetchByLevel").mockRejectedValueOnce(
      new Error("Authentication required. GAIA is a gated dataset - please provide HF_TOKEN")
    )

    const evaluation: EvaluationInput = {
      type: "gaia",
      taskId: "auth-error",
      goal: "Auth error test",
      workflowId: "workflow-auth-error",
    }

    const result = await IngestionLayer.convert(evaluation)
    expect(result).toHaveLength(1)
    expect(result[0].workflowInput).toContain("GAIA dataset requires authentication")
    expect(result[0].workflowInput).toContain("Fallback Question: What is 2 + 2?")
    expect(result[0].workflowOutput.output).toBe("4")
  })
})
