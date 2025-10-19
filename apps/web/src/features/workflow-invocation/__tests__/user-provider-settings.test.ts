import type { Principal } from "@/lib/auth/principal"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchUserProviderSettings } from "../lib/user-provider-settings"

// Mock Supabase client - use vi.hoisted to ensure mocks are available
// Need separate mocks for the two .eq() calls in the chain
const { mockSelect, mockEq1, mockEq2, mockFrom, mockSchema } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockEq1: vi.fn(),
  mockEq2: vi.fn(),
  mockFrom: vi.fn(),
  mockSchema: vi.fn(),
}))

vi.mock("@/lib/supabase/context-aware-client", () => ({
  createContextAwareClient: vi.fn().mockResolvedValue({
    schema: mockSchema,
  }),
}))

describe("fetchUserProviderSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock chain: schema().from().select().eq().eq()
    mockSchema.mockReturnValue({
      from: mockFrom,
    })
    mockFrom.mockReturnValue({
      select: mockSelect,
    })
    mockSelect.mockReturnValue({
      eq: mockEq1,
    })
    mockEq1.mockReturnValue({
      eq: mockEq2,
    })
  })

  it("should fetch and parse provider settings successfully", async () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const mockData = [
      {
        provider: "openai",
        enabled_models: ["gpt-4o", "gpt-4o-mini"],
        is_enabled: true,
      },
      {
        provider: "groq",
        enabled_models: ["llama-3.1-8b", "llama-3.1-70b"],
        is_enabled: true,
      },
    ]

    mockEq2.mockResolvedValue({
      data: mockData,
      error: null,
    })

    const result = await fetchUserProviderSettings("user_123", principal)

    expect(result.size).toBe(2)
    expect(result.get("openai")).toEqual(["gpt-4o", "gpt-4o-mini"])
    expect(result.get("groq")).toEqual(["llama-3.1-8b", "llama-3.1-70b"])
  })

  it("should return empty map on database error", async () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    mockEq2.mockResolvedValue({
      data: null,
      error: { message: "Database connection failed" },
    })

    const result = await fetchUserProviderSettings("user_123", principal)

    expect(result.size).toBe(0)
  })

  it("should return empty map when no settings found", async () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    mockEq2.mockResolvedValue({
      data: [],
      error: null,
    })

    const result = await fetchUserProviderSettings("user_123", principal)

    expect(result.size).toBe(0)
  })

  it("should return empty map when data is null", async () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    mockEq2.mockResolvedValue({
      data: null,
      error: null,
    })

    const result = await fetchUserProviderSettings("user_123", principal)

    expect(result.size).toBe(0)
  })

  it("should parse JSON string in enabled_models", async () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const mockData = [
      {
        provider: "openai",
        enabled_models: '["gpt-4o", "gpt-3.5-turbo"]',
        is_enabled: true,
      },
    ]

    mockEq2.mockResolvedValue({
      data: mockData,
      error: null,
    })

    const result = await fetchUserProviderSettings("user_123", principal)

    expect(result.get("openai")).toEqual(["gpt-4o", "gpt-3.5-turbo"])
  })

  it("should skip provider with invalid JSON in enabled_models", async () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const mockData = [
      {
        provider: "openai",
        enabled_models: "invalid json",
        is_enabled: true,
      },
      {
        provider: "groq",
        enabled_models: ["llama-3.1-8b"],
        is_enabled: true,
      },
    ]

    mockEq2.mockResolvedValue({
      data: mockData,
      error: null,
    })

    const result = await fetchUserProviderSettings("user_123", principal)

    expect(result.size).toBe(1)
    expect(result.has("openai")).toBe(false)
    expect(result.get("groq")).toEqual(["llama-3.1-8b"])
  })

  it("should skip provider with empty models array", async () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const mockData = [
      {
        provider: "openai",
        enabled_models: [],
        is_enabled: true,
      },
      {
        provider: "groq",
        enabled_models: ["llama-3.1-8b"],
        is_enabled: true,
      },
    ]

    mockEq2.mockResolvedValue({
      data: mockData,
      error: null,
    })

    const result = await fetchUserProviderSettings("user_123", principal)

    expect(result.size).toBe(1)
    expect(result.has("openai")).toBe(false)
    expect(result.get("groq")).toEqual(["llama-3.1-8b"])
  })

  it("should only return enabled providers", async () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const mockData = [
      {
        provider: "openai",
        enabled_models: ["gpt-4o"],
        is_enabled: true,
      },
    ]

    mockEq2.mockResolvedValue({
      data: mockData,
      error: null,
    })

    const result = await fetchUserProviderSettings("user_123", principal)

    expect(mockEq1).toHaveBeenCalledWith("clerk_id", "user_123")
    expect(mockEq2).toHaveBeenCalledWith("is_enabled", true)
  })

  it("should handle multiple providers with mixed data formats", async () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const mockData = [
      {
        provider: "openai",
        enabled_models: ["gpt-4o"],
        is_enabled: true,
      },
      {
        provider: "groq",
        enabled_models: '["llama-3.1-8b", "llama-3.1-70b"]',
        is_enabled: true,
      },
      {
        provider: "anthropic",
        enabled_models: ["claude-3-opus"],
        is_enabled: true,
      },
    ]

    mockEq2.mockResolvedValue({
      data: mockData,
      error: null,
    })

    const result = await fetchUserProviderSettings("user_123", principal)

    expect(result.size).toBe(3)
    expect(result.get("openai")).toEqual(["gpt-4o"])
    expect(result.get("groq")).toEqual(["llama-3.1-8b", "llama-3.1-70b"])
    expect(result.get("anthropic")).toEqual(["claude-3-opus"])
  })

  it("should return empty map on exception", async () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    mockEq2.mockRejectedValue(new Error("Connection timeout"))

    const result = await fetchUserProviderSettings("user_123", principal)

    expect(result.size).toBe(0)
  })

  it("should call createContextAwareClient with principal", async () => {
    const { createContextAwareClient } = await import("@/lib/supabase/context-aware-client")

    const principal: Principal = {
      auth_method: "api_key",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    mockEq2.mockResolvedValue({
      data: [],
      error: null,
    })

    await fetchUserProviderSettings("user_123", principal)

    expect(createContextAwareClient).toHaveBeenCalledWith(principal)
  })

  it("should use app schema", async () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    mockEq2.mockResolvedValue({
      data: [],
      error: null,
    })

    await fetchUserProviderSettings("user_123", principal)

    expect(mockSchema).toHaveBeenCalledWith("app")
  })

  it("should query provider_settings table", async () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    mockEq2.mockResolvedValue({
      data: [],
      error: null,
    })

    await fetchUserProviderSettings("user_123", principal)

    expect(mockFrom).toHaveBeenCalledWith("provider_settings")
  })

  it("should select correct columns", async () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    mockEq2.mockResolvedValue({
      data: [],
      error: null,
    })

    await fetchUserProviderSettings("user_123", principal)

    expect(mockSelect).toHaveBeenCalledWith("provider, enabled_models, is_enabled")
  })
})
