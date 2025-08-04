import { beforeEach, describe, expect, it, vi } from "vitest"
import { IngestionLayer } from "../IngestionLayer"
import { GAIALoader } from "../benchmarks/gaia/GAIALoader"
import type { EvaluationInput } from "../ingestion.types"

vi.mock("../benchmarks/gaia/GAIALoader")

describe("IngestionLayer - GAIA", () => {
  // FAILING: These tests are failing because they require authentication tokens
  // Error logs show: "HF_TOKEN or HUGGING_FACE_API_KEY not found in environment"
  // GAIA is a gated dataset requiring Hugging Face authentication
  // Tests fail because the required environment variables are missing
  // Solution: Either provide auth tokens or mock the authentication layer

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    // reset environment variables
    delete process.env.HF_TOKEN
  })

  it("should convert GAIA evaluation to WorkflowIO", async () => {
    const mockGAIAInstance = {
      task_id: "test-123",
      Question: "What is 2 + 2?",
      Level: 1,
      "Final answer": "4",
      file_name: undefined,
    }

    vi.mocked(GAIALoader.fetchById).mockResolvedValueOnce(mockGAIAInstance)

    const evaluation: EvaluationInput = {
      type: "gaia",
      taskId: "test-123",
      goal: "Solve this GAIA benchmark task",
      workflowId: "workflow-123",
    }

    const result = await IngestionLayer.convert(evaluation)

    expect(result).toHaveLength(1)
    expect(result[0].workflowInput).toContain("Solve this GAIA benchmark task")
    expect(result[0].workflowInput).toContain("Task ID: test-123")
    expect(result[0].workflowInput).toContain("Level: 1")
    expect(result[0].workflowInput).toContain("What is 2 + 2?")
    expect(result[0].expectedWorkflowOutput).toBe("4")

    // verify GAIALoader was called correctly
    expect(GAIALoader.fetchById).toHaveBeenCalledWith(
      "test-123",
      "validation",
      undefined
    )
  })

  it("should handle GAIA instance with file attachment", async () => {
    const mockGAIAInstance = {
      task_id: "file-task",
      Question: "Analyze the attached spreadsheet",
      Level: 2,
      "Final answer": "Total: 1500",
      file_name: "data.xlsx",
    }

    vi.mocked(GAIALoader.fetchById).mockResolvedValueOnce(mockGAIAInstance)

    const evaluation: EvaluationInput = {
      type: "gaia",
      taskId: "file-task",
      goal: "Process GAIA task with file",
      workflowId: "workflow-456",
    }

    const result = await IngestionLayer.convert(evaluation)

    expect(result[0].workflowInput).toContain("attached file: data.xlsx")
    expect(result[0].workflowInput).toContain(
      "The file content should be processed"
    )
  })

  it("should use specified split", async () => {
    const mockGAIAInstance = {
      task_id: "test-split",
      Question: "Test question",
      Level: 1,
      "Final answer": "Test answer",
    }

    vi.mocked(GAIALoader.fetchById).mockResolvedValueOnce(mockGAIAInstance)

    const evaluation: EvaluationInput = {
      type: "gaia",
      taskId: "test-split",
      split: "test",
      goal: "Use test split",
      workflowId: "workflow-789",
    }

    await IngestionLayer.convert(evaluation)

    expect(GAIALoader.fetchById).toHaveBeenCalledWith(
      "test-split",
      "test",
      undefined
    )
  })

  it("should pass HF_TOKEN when available", async () => {
    process.env.HF_TOKEN = "test-token-123"

    const mockGAIAInstance = {
      task_id: "auth-task",
      Question: "Auth test",
      Level: 1,
      "Final answer": "Answer",
    }

    vi.mocked(GAIALoader.fetchById).mockResolvedValueOnce(mockGAIAInstance)

    const evaluation: EvaluationInput = {
      type: "gaia",
      taskId: "auth-task",
      goal: "Test with auth",
      workflowId: "workflow-auth",
    }

    await IngestionLayer.convert(evaluation)

    expect(GAIALoader.fetchById).toHaveBeenCalledWith(
      "auth-task",
      "validation",
      "test-token-123"
    )
  })

  it("should handle GAIA instance without final answer", async () => {
    const mockGAIAInstance = {
      task_id: "no-answer",
      Question: "Question without answer",
      Level: 3,
      file_name: undefined,
    }

    vi.mocked(GAIALoader.fetchById).mockResolvedValueOnce(mockGAIAInstance)

    const evaluation: EvaluationInput = {
      type: "gaia",
      taskId: "no-answer",
      goal: "Handle missing answer",
      workflowId: "workflow-999",
    }

    const result = await IngestionLayer.convert(evaluation)

    expect(result[0].expectedWorkflowOutput).toBe("")
  })

  it("should handle different difficulty levels", async () => {
    const mockGAIAInstance = {
      task_id: "level-3-task",
      Question: "Complex multi-step question",
      Level: 3,
      "Final answer": "Complex answer",
    }

    vi.mocked(GAIALoader.fetchById).mockResolvedValueOnce(mockGAIAInstance)

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
    vi.mocked(GAIALoader.fetchById).mockRejectedValueOnce(
      new Error("Failed to fetch GAIA instance")
    )

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

  it("should handle authentication errors", async () => {
    vi.mocked(GAIALoader.fetchById).mockRejectedValueOnce(
      new Error(
        "Authentication required. GAIA is a gated dataset - please provide HF_TOKEN"
      )
    )

    const evaluation: EvaluationInput = {
      type: "gaia",
      taskId: "auth-error",
      goal: "Auth error test",
      workflowId: "workflow-auth-error",
    }

    await expect(IngestionLayer.convert(evaluation)).rejects.toThrow(
      "failed to convert GAIA evaluation: Authentication required"
    )
  })
})
