import type { Principal } from "@/lib/auth/principal"
import type { MCPToolkitMap } from "@lucky/shared"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { loadMCPToolkitsForWorkflow } from "../lib/mcp-toolkit-loader"

// Mock the database toolkit loader
vi.mock("@/lib/mcp/database-toolkit-loader", () => ({
  loadMCPToolkitsFromDatabase: vi.fn(),
}))

describe("loadMCPToolkitsForWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NODE_ENV", "development")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("should return undefined for non-session auth", async () => {
    const principal: Principal = {
      auth_method: "api_key",
      clerk_id: "user_123",
      scopes: [],
    }

    const result = await loadMCPToolkitsForWorkflow(principal)

    expect(result).toBeUndefined()
  })

  it("should return undefined in production environment", async () => {
    vi.stubEnv("NODE_ENV", "production")

    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: [],
    }

    const result = await loadMCPToolkitsForWorkflow(principal)

    expect(result).toBeUndefined()
  })

  it("should load MCP toolkits for session auth in non-production", async () => {
    const { loadMCPToolkitsFromDatabase } = await import("@/lib/mcp/database-toolkit-loader")

    const mockToolkits: MCPToolkitMap = {
      toolkit1: { transport: { kind: "stdio", spec: { command: "test", args: [] } }, tools: {} },
    }

    vi.mocked(loadMCPToolkitsFromDatabase).mockResolvedValue(mockToolkits)

    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: [],
    }

    const result = await loadMCPToolkitsForWorkflow(principal)

    expect(result).toEqual(mockToolkits)
    expect(loadMCPToolkitsFromDatabase).toHaveBeenCalledWith("user_123")
  })

  it("should return undefined when no toolkits found", async () => {
    const { loadMCPToolkitsFromDatabase } = await import("@/lib/mcp/database-toolkit-loader")

    vi.mocked(loadMCPToolkitsFromDatabase).mockResolvedValue(undefined)

    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: [],
    }

    const result = await loadMCPToolkitsForWorkflow(principal)

    expect(result).toBeUndefined()
  })

  it("should return undefined when database load fails", async () => {
    const { loadMCPToolkitsFromDatabase } = await import("@/lib/mcp/database-toolkit-loader")

    vi.mocked(loadMCPToolkitsFromDatabase).mockRejectedValue(new Error("Database connection failed"))

    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: [],
    }

    const result = await loadMCPToolkitsForWorkflow(principal)

    expect(result).toBeUndefined()
  })

  it("should work in development environment", async () => {
    const { loadMCPToolkitsFromDatabase } = await import("@/lib/mcp/database-toolkit-loader")

    vi.stubEnv("NODE_ENV", "development")

    const mockToolkits: MCPToolkitMap = {
      toolkit1: { transport: { kind: "stdio", spec: { command: "test", args: [] } }, tools: {} },
    }

    vi.mocked(loadMCPToolkitsFromDatabase).mockResolvedValue(mockToolkits)

    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_dev",
      scopes: [],
    }

    const result = await loadMCPToolkitsForWorkflow(principal)

    expect(result).toEqual(mockToolkits)
  })

  it("should work in test environment", async () => {
    const { loadMCPToolkitsFromDatabase } = await import("@/lib/mcp/database-toolkit-loader")

    vi.stubEnv("NODE_ENV", "test")

    const mockToolkits: MCPToolkitMap = {
      toolkit1: { transport: { kind: "stdio", spec: { command: "test", args: [] } }, tools: {} },
    }

    vi.mocked(loadMCPToolkitsFromDatabase).mockResolvedValue(mockToolkits)

    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_test",
      scopes: [],
    }

    const result = await loadMCPToolkitsForWorkflow(principal)

    expect(result).toEqual(mockToolkits)
  })

  it("should return undefined for api_key auth even in development", async () => {
    vi.stubEnv("NODE_ENV", "development")

    const principal: Principal = {
      auth_method: "api_key",
      clerk_id: "user_123",
      scopes: [],
    }

    const result = await loadMCPToolkitsForWorkflow(principal)

    expect(result).toBeUndefined()
  })

  it("should handle empty toolkit map", async () => {
    const { loadMCPToolkitsFromDatabase } = await import("@/lib/mcp/database-toolkit-loader")

    const emptyToolkits: MCPToolkitMap = {}

    vi.mocked(loadMCPToolkitsFromDatabase).mockResolvedValue(emptyToolkits)

    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: [],
    }

    const result = await loadMCPToolkitsForWorkflow(principal)

    expect(result).toEqual(emptyToolkits)
    expect(Object.keys(result || {}).length).toBe(0)
  })

  it("should handle multiple toolkits", async () => {
    const { loadMCPToolkitsFromDatabase } = await import("@/lib/mcp/database-toolkit-loader")

    const mockToolkits: MCPToolkitMap = {
      toolkit1: { transport: { kind: "stdio", spec: { command: "test", args: [] } }, tools: {} },
      toolkit2: { transport: { kind: "stdio", spec: { command: "test", args: [] } }, tools: {} },
      toolkit3: { transport: { kind: "stdio", spec: { command: "test", args: [] } }, tools: {} },
    }

    vi.mocked(loadMCPToolkitsFromDatabase).mockResolvedValue(mockToolkits)

    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: [],
    }

    const result = await loadMCPToolkitsForWorkflow(principal)

    expect(Object.keys(result || {}).length).toBe(3)
    expect("toolkit1" in (result || {})).toBe(true)
    expect("toolkit2" in (result || {})).toBe(true)
    expect("toolkit3" in (result || {})).toBe(true)
  })
})
