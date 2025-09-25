import { beforeEach, describe, expect, it, vi } from "vitest"

// mock supabase client
vi.mock("@core/utils/clients/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// mock logger
vi.mock("@core/utils/logging/Logger", () => ({
  lgg: {
    error: vi.fn(),
    info: vi.fn(),
    log: vi.fn(),
  },
}))

import { supabase } from "@core/utils/clients/supabase/client"
import { lgg } from "@core/utils/logging/Logger"
import { cleanupStaleRecords } from "../cleanupStaleRecords"

describe("cleanupStaleRecords", () => {
  // TODO: test coverage improvements needed:
  // 1. only tests workflow invocation cleanup, but function might support other record types
  // 2. no test for partial failures (some records cleaned, others fail)
  // 3. no test for empty database scenario explicitly
  // 4. no test for large batch cleanup performance
  // 5. no test for concurrent cleanup operations
  // 6. consider testing cleanup with different age thresholds if configurable
  const mockFrom = vi.mocked(supabase.from)
  const mockLgg = vi.mocked(lgg)

  beforeEach(() => {
    vi.clearAllMocks()

    // setup default mock chains
    const mockChain = {
      eq: vi.fn().mockReturnValue({
        lt: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      is: vi.fn().mockReturnValue({
        lt: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }

    const mockDeleteChain = {
      lt: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }

    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue(mockChain),
      delete: vi.fn().mockReturnValue(mockDeleteChain),
      // Support direct select().is() chain used when fetching runs missing end_time
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as unknown as ReturnType<typeof supabase.from>)
  })

  it("should cleanup stale workflow invocations", async () => {
    const mockData = [{ wf_invocation_id: "test-id" }]
    const mockChain = {
      eq: vi.fn().mockReturnValue({
        lt: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
      is: vi.fn().mockReturnValue({
        lt: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }

    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue(mockChain),
      // also include select in this specific call path for completeness
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as unknown as ReturnType<typeof supabase.from>)

    const stats = await cleanupStaleRecords()

    expect(mockFrom).toHaveBeenCalledWith("WorkflowInvocation")
    expect(stats.workflowInvocations).toBe(1)
    expect(mockLgg.info).toHaveBeenCalledWith("marked 1 stale workflow invocations as failed")
  })

  it("should handle database errors gracefully", async () => {
    const error = new Error("database error")
    const mockChain = {
      eq: vi.fn().mockReturnValue({
        lt: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: null, error }),
        }),
      }),
      is: vi.fn().mockReturnValue({
        lt: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }

    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue(mockChain),
    } as unknown as ReturnType<typeof supabase.from>)

    const stats = await cleanupStaleRecords()

    expect(mockLgg.error).toHaveBeenCalledWith("failed to cleanup stale workflow invocations:", error)
    expect(stats.workflowInvocations).toBe(0)
  })
})
