import { describe, expect, it, vi, beforeEach } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

// mock supabase client
vi.mock("@/core/utils/clients/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// mock logger
vi.mock("@/core/utils/logging/Logger", () => ({
  lgg: {
    error: vi.fn(),
    info: vi.fn(),
    log: vi.fn(),
  },
}))

import { cleanupStaleRecords } from "../cleanupStaleRecords"
import { supabase } from "@/core/utils/clients/supabase/client"
import { lgg } from "@/core/utils/logging/Logger"

describe("cleanupStaleRecords", () => {
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
    } as unknown as ReturnType<typeof supabase.from>)

    const stats = await cleanupStaleRecords()

    expect(mockFrom).toHaveBeenCalledWith("WorkflowInvocation")
    expect(stats.workflowInvocations).toBe(1)
    expect(mockLgg.info).toHaveBeenCalledWith(
      "marked 1 stale workflow invocations as failed"
    )
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

    expect(mockLgg.error).toHaveBeenCalledWith(
      "failed to cleanup stale workflow invocations:",
      error
    )
    expect(stats.workflowInvocations).toBe(0)
  })
})
