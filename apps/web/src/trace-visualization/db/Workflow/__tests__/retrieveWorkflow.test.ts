import { beforeEach, describe, expect, it, vi } from "vitest"
import { retrieveWorkflowInvocations } from "../retrieveWorkflow"

// FAILING: "Cannot access 'mockSupabase' before initialization" - vitest hoisting issue with mock variables
// Mock supabase
const mockSupabase = {
  from: vi.fn(),
}

vi.mock("@lucky/core/utils/clients/supabase/client", () => ({
  supabase: mockSupabase,
}))

describe("retrieveWorkflowInvocations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should sort by duration correctly", async () => {
    const mockData = [
      {
        wf_invocation_id: "1",
        start_time: "2023-01-01T10:00:00Z",
        end_time: "2023-01-01T10:05:00Z", // 5 minutes
        status: "completed",
      },
      {
        wf_invocation_id: "2",
        start_time: "2023-01-01T10:00:00Z",
        end_time: "2023-01-01T10:02:00Z", // 2 minutes
        status: "completed",
      },
      {
        wf_invocation_id: "3",
        start_time: "2023-01-01T10:00:00Z",
        end_time: null, // running
        status: "running",
      },
    ]

    const mockQuery = {
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    }

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery),
    })

    mockQuery.order.mockResolvedValue({
      data: mockData,
      error: null,
      count: mockData.length,
    })

    const result = await retrieveWorkflowInvocations(undefined, undefined, undefined, {
      field: "duration",
      order: "asc",
    })

    expect(result).toBeDefined()
    expect(result.data).toBeDefined()
    expect(result.data[0].wf_invocation_id).toBe("2") // shortest duration first
    expect(result.data[1].wf_invocation_id).toBe("1") // longer duration second
    expect(result.data[2].wf_invocation_id).toBe("3") // running (null) last
  })

  it("should sort by duration in descending order", async () => {
    const mockData = [
      {
        wf_invocation_id: "1",
        start_time: "2023-01-01T10:00:00Z",
        end_time: "2023-01-01T10:02:00Z", // 2 minutes
        status: "completed",
      },
      {
        wf_invocation_id: "2",
        start_time: "2023-01-01T10:00:00Z",
        end_time: "2023-01-01T10:05:00Z", // 5 minutes
        status: "completed",
      },
      {
        wf_invocation_id: "3",
        start_time: "2023-01-01T10:00:00Z",
        end_time: null, // running
        status: "running",
      },
    ]

    const mockQuery = {
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    }

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery),
    })

    mockQuery.order.mockResolvedValue({
      data: mockData,
      error: null,
      count: mockData.length,
    })

    const result = await retrieveWorkflowInvocations(undefined, undefined, undefined, {
      field: "duration",
      order: "desc",
    })

    expect(result).toBeDefined()
    expect(result.data).toBeDefined()
    expect(result.data[0].wf_invocation_id).toBe("3") // running (null) first
    expect(result.data[1].wf_invocation_id).toBe("2") // longer duration second
    expect(result.data[2].wf_invocation_id).toBe("1") // shortest duration last
  })
})
