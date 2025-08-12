import { describe, expect, it, vi } from "vitest"
import { retrieveNodeInvocationSummaries } from "../retrieveNodeSummaries"

// mock supabase client
vi.mock("@core/utils/clients/supabase/client", () => {
  const mockSupabaseClient = {
    from: vi.fn(() => mockSupabaseClient),
    select: vi.fn(() => mockSupabaseClient),
    eq: vi.fn(() => mockSupabaseClient),
    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
  }

  return {
    supabase: mockSupabaseClient,
  }
})

describe("retrieveNodeSummaries", () => {
  // TODO: additional test coverage needed:
  // 1. no tests for pagination or large result sets
  // 2. no tests for filtering/sorting options if supported
  // 3. no tests for partial data (missing fields in database records)
  // 4. no tests for data type validation (e.g. invalid date formats, negative costs)
  // 5. no tests for concurrent queries
  // 6. no tests for malformed data from database
  // 7. consider testing with different order/sort parameters if supported
  it("should retrieve node invocation summaries for a specific node", async () => {
    const mockData = [
      {
        node_invocation_id: "inv1",
        node_id: "node1",
        start_time: "2024-01-01T00:00:00Z",
        end_time: "2024-01-01T00:01:00Z",
        summary: "Executed search operation successfully",
        large_summary: "Detailed execution: search returned 10 results...",
        usd_cost: 0.002,
        status: "completed",
      },
    ]

    const { supabase } = await import("@core/utils/clients/supabase/client")
    ;(supabase as any).order.mockResolvedValueOnce({
      data: mockData,
      error: null,
    })

    const result = await retrieveNodeInvocationSummaries("wf123", "node1")

    expect(result).toEqual(mockData)
    expect((supabase as any).from).toHaveBeenCalledWith("NodeInvocation")
    expect((supabase as any).eq).toHaveBeenCalledWith(
      "wf_invocation_id",
      "wf123"
    )
    expect((supabase as any).eq).toHaveBeenCalledWith("node_id", "node1")
  })

  it("should handle empty results gracefully", async () => {
    const { supabase } = await import("@core/utils/clients/supabase/client")
    ;(supabase as any).order.mockResolvedValueOnce({
      data: [],
      error: null,
    })

    const result = await retrieveNodeInvocationSummaries("wf123", "node1")

    expect(result).toEqual([])
  })

  it("should throw error when supabase query fails", async () => {
    const { supabase } = await import("@core/utils/clients/supabase/client")
    ;(supabase as any).order.mockResolvedValueOnce({
      data: null,
      error: new Error("Database error"),
    })

    await expect(
      retrieveNodeInvocationSummaries("wf123", "node1")
    ).rejects.toThrow("Database error")
  })
})
