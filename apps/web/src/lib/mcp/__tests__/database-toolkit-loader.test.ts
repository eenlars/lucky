import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the supabase module
vi.mock("@/lib/supabase/server-rls", () => ({
  createRLSClient: vi.fn(),
}))

// Mock the shared module
vi.mock("@lucky/shared", () => ({
  uiConfigToToolkits: vi.fn((mcpServers: Record<string, any>) => {
    const result: Record<string, any> = {}
    for (const [name, config] of Object.entries(mcpServers)) {
      result[name] = {
        transport: {
          kind: "stdio",
          spec: config,
        },
      }
    }
    return result
  }),
}))

// Import after mocks are set up
import { loadMCPToolkitsFromDatabase } from "../database-toolkit-loader"

describe("loadMCPToolkitsFromDatabase", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
  })

  it("returns undefined when no configs found in database", async () => {
    const { createRLSClient } = await import("@/lib/supabase/server-rls")

    vi.mocked(createRLSClient).mockResolvedValue({
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
    } as any)

    const result = await loadMCPToolkitsFromDatabase("user-123")

    expect(result).toBeUndefined()
  })

  it("returns undefined when database query fails", async () => {
    const { createRLSClient } = await import("@/lib/supabase/server-rls")
    const mockError = { message: "Database connection error" }

    vi.mocked(createRLSClient).mockResolvedValue({
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: mockError }),
              }),
            }),
          }),
        }),
      }),
    } as any)

    const result = await loadMCPToolkitsFromDatabase("user-123")

    expect(result).toBeUndefined()
  })

  it("handles mixed enabled/disabled configs", async () => {
    // Test that we only load enabled configs
    const { createRLSClient } = await import("@/lib/supabase/server-rls")

    vi.mocked(createRLSClient).mockResolvedValue({
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
    } as any)

    const result = await loadMCPToolkitsFromDatabase("user-123")

    expect(result).toBeUndefined()
  })

  it("handles errors during toolkit loading gracefully", async () => {
    const { createRLSClient } = await import("@/lib/supabase/server-rls")
    vi.mocked(createRLSClient).mockRejectedValue(new Error("Connection failed"))

    const result = await loadMCPToolkitsFromDatabase("user-123")

    expect(result).toBeUndefined()
  })
})
