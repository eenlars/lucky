import { supabase } from "@core/utils/clients/supabase/client"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import { CONFIG } from "@runtime/settings/constants"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { IngestionLayer } from "../IngestionLayer"

vi.mock("@core/utils/clients/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe("IngestionLayer - Dataset Records", () => {
  beforeEach(() => {
    ;(CONFIG as any).ingestion = (CONFIG as any).ingestion || { taskLimit: 10 }
    ;(CONFIG as any).logging = (CONFIG as any).logging || {
      level: "info",
      override: { Setup: false },
    }
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it("should convert dataset record evaluation to WorkflowIO", async () => {
    const mockRecords = [
      {
        dataset_record_id: "test-id-123",
        workflow_input: "find the patagonia stores in amsterdam",
        ground_truth: "singel 486 amsterdam",
        output_schema_json: null,
        rubric: null,
        created_at: "2025-01-01T00:00:00Z",
      },
    ]

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: mockRecords,
          error: null,
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    const evaluation: EvaluationInput = {
      type: "dataset-records",
      goal: "find physical stores",
      workflowId: "test-workflow",
      recordIds: ["test-id-123"],
    }

    const result = await IngestionLayer.convert(evaluation)

    expect(result).toHaveLength(1)
    expect(result[0].workflowInput).toBe(
      "find the patagonia stores in amsterdam"
    )
    expect(result[0].workflowOutput.output).toBe("singel 486 amsterdam")
    expect(result[0].workflowOutput.outputSchema).toBeUndefined()

    expect(supabase.from).toHaveBeenCalledWith("DatasetRecord")
    expect(mockFrom().select).toHaveBeenCalledWith("*")
    expect(mockFrom().select().in).toHaveBeenCalledWith("dataset_record_id", [
      "test-id-123",
    ])
  })

  it("should handle multiple dataset records", async () => {
    const mockRecords = [
      {
        dataset_record_id: "test-id-1",
        workflow_input: "find nike stores in berlin",
        ground_truth: "potsdamer platz 5",
        output_schema_json: null,
        rubric: null,
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        dataset_record_id: "test-id-2",
        workflow_input: "find adidas stores in munich",
        ground_truth: "marienplatz 12",
        output_schema_json: null,
        rubric: null,
        created_at: "2025-01-01T00:00:00Z",
      },
    ]

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: mockRecords,
          error: null,
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    const evaluation: EvaluationInput = {
      type: "dataset-records",
      goal: "find physical stores",
      workflowId: "test-workflow",
      recordIds: ["test-id-1", "test-id-2"],
    }

    const result = await IngestionLayer.convert(evaluation)

    expect(result).toHaveLength(2)
    expect(result[0].workflowInput).toBe("find nike stores in berlin")
    expect(result[0].workflowOutput.output).toBe("potsdamer platz 5")
    expect(result[1].workflowInput).toBe("find adidas stores in munich")
    expect(result[1].workflowOutput.output).toBe("marienplatz 12")
  })

  it("should use goal fallback when workflow_input is null", async () => {
    const mockRecords = [
      {
        dataset_record_id: "test-id-null",
        workflow_input: null,
        ground_truth: "fallback result",
        output_schema_json: null,
        rubric: null,
        created_at: "2025-01-01T00:00:00Z",
      },
    ]

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: mockRecords,
          error: null,
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    const evaluation: EvaluationInput = {
      type: "dataset-records",
      goal: "fallback goal test",
      workflowId: "test-workflow",
      recordIds: ["test-id-null"],
    }

    const result = await IngestionLayer.convert(evaluation)

    expect(result[0].workflowInput).toBe("fallback goal test")
    expect(result[0].workflowOutput.output).toBe("fallback result")
  })

  it("should include outputSchema when provided", async () => {
    const mockRecords = [
      {
        dataset_record_id: "test-id-schema",
        workflow_input: "test input",
        ground_truth: "test output",
        output_schema_json: null,
        rubric: null,
        created_at: "2025-01-01T00:00:00Z",
      },
    ]

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: mockRecords,
          error: null,
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    const mockSchema = { type: "string" }
    const evaluation: EvaluationInput = {
      type: "dataset-records",
      goal: "test goal",
      workflowId: "test-workflow",
      recordIds: ["test-id-schema"],
      outputSchema: mockSchema as any,
    }

    const result = await IngestionLayer.convert(evaluation)

    expect(result[0].workflowOutput.outputSchema).toBe(mockSchema)
  })

  it("should throw error when no record IDs provided", async () => {
    // Need to mock supabase even though we won't reach the query
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    const evaluation: EvaluationInput = {
      type: "dataset-records",
      goal: "test goal",
      workflowId: "test-workflow",
      recordIds: [],
    }

    await expect(IngestionLayer.convert(evaluation)).rejects.toThrow(
      "dataset-records evaluation requires at least one record ID"
    )
  })

  it("should throw error when database query fails", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database connection failed" },
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    const evaluation: EvaluationInput = {
      type: "dataset-records",
      goal: "test goal",
      workflowId: "test-workflow",
      recordIds: ["test-id-error"],
    }

    await expect(IngestionLayer.convert(evaluation)).rejects.toThrow(
      "failed to convert dataset record evaluation: failed to fetch dataset records: Database connection failed"
    )
  })

  it("should throw error when no records found", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    const evaluation: EvaluationInput = {
      type: "dataset-records",
      goal: "test goal",
      workflowId: "test-workflow",
      recordIds: ["non-existent-id"],
    }

    await expect(IngestionLayer.convert(evaluation)).rejects.toThrow(
      "no dataset records found for IDs: non-existent-id"
    )
  })
})
