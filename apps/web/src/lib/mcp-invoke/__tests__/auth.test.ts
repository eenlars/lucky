import { beforeEach, describe, expect, it, vi } from "vitest"

// Declare mock functions with vi.fn() factory
const mockCreateClient = vi.fn()
const mockHashSecret = vi.fn()
const mockLogException = vi.fn()

// Mock modules - factories must not reference outer scope variables
vi.mock("@/lib/supabase/server")
vi.mock("@/features/secret-management/lib/api-key-utils")
vi.mock("@/lib/error-logger")

import * as apiKeyUtils from "@/features/secret-management/lib/api-key-utils"
import * as errorLogger from "@/lib/error-logger"
import * as supabaseServer from "@/lib/supabase/server"
// Import after mocks are set up
import { validateBearerToken } from "../auth"

describe("validateBearerToken", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Set up mocks
    vi.mocked(supabaseServer.createClient).mockImplementation(mockCreateClient)
    vi.mocked(apiKeyUtils.hashSecret).mockImplementation(mockHashSecret)
    vi.mocked(errorLogger.logException).mockImplementation(mockLogException)
  })

  it("should return false for tokens not starting with alive_", async () => {
    const result = await validateBearerToken("invalid_token", "wf_test_123")
    expect(result).toBe(false)
    expect(mockHashSecret).not.toHaveBeenCalled()
  })

  it("should return false for short tokens", async () => {
    const result = await validateBearerToken("alive_", "wf_test_123")
    expect(result).toBe(false)
  })

  it("should validate token exists and is not revoked", async () => {
    const mockSupabase = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          clerk_id: "user_123",
          scopes: { all: true },
          revoked_at: null,
        },
        error: null,
      }),
    }

    mockCreateClient.mockResolvedValue(mockSupabase)
    mockHashSecret.mockReturnValue("hashed_secret")

    const result = await validateBearerToken("alive_test_secret_key", "wf_test_123")

    expect(result).toBe(true)
    expect(mockHashSecret).toHaveBeenCalledWith("test_secret_key")
    expect(mockSupabase.schema).toHaveBeenCalledWith("lockbox")
    expect(mockSupabase.from).toHaveBeenCalledWith("secret_keys")
    expect(mockSupabase.select).toHaveBeenCalledWith("clerk_id, scopes, revoked_at")
    expect(mockSupabase.eq).toHaveBeenCalledWith("secret_hash", "hashed_secret")
    expect(mockSupabase.is).toHaveBeenCalledWith("revoked_at", null)
  })

  it("should return true for token with all scopes", async () => {
    const mockSupabase = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          clerk_id: "user_123",
          scopes: { all: true },
          revoked_at: null,
        },
        error: null,
      }),
    }

    mockCreateClient.mockResolvedValue(mockSupabase)
    mockHashSecret.mockReturnValue("hashed_secret")

    const result = await validateBearerToken("alive_test_key", "wf_specific_123")

    expect(result).toBe(true)
  })

  it("should return true for token with matching workflow scope", async () => {
    const mockSupabase = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          clerk_id: "user_123",
          scopes: { workflows: ["wf_123", "wf_456"] },
          revoked_at: null,
        },
        error: null,
      }),
    }

    mockCreateClient.mockResolvedValue(mockSupabase)
    mockHashSecret.mockReturnValue("hashed_secret")

    const result = await validateBearerToken("alive_test_key", "wf_123")

    expect(result).toBe(true)
  })

  it("should return false for token without matching workflow scope", async () => {
    const mockSupabase = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          clerk_id: "user_123",
          scopes: { workflows: ["wf_123", "wf_456"] },
          revoked_at: null,
        },
        error: null,
      }),
    }

    mockCreateClient.mockResolvedValue(mockSupabase)
    mockHashSecret.mockReturnValue("hashed_secret")

    const result = await validateBearerToken("alive_test_key", "wf_789")

    expect(result).toBe(false)
  })

  it("should return false when token is not found in database", async () => {
    const mockSupabase = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }

    mockCreateClient.mockResolvedValue(mockSupabase)
    mockHashSecret.mockReturnValue("hashed_secret")

    const result = await validateBearerToken("alive_nonexistent_key", "wf_test_123")

    expect(result).toBe(false)
  })

  it("should return false when token is revoked", async () => {
    const mockSupabase = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null, // is() filter would exclude revoked tokens
        error: null,
      }),
    }

    mockCreateClient.mockResolvedValue(mockSupabase)
    mockHashSecret.mockReturnValue("hashed_secret")

    const result = await validateBearerToken("alive_revoked_key", "wf_test_123")

    expect(result).toBe(false)
  })

  it("should return false when database query fails", async () => {
    const mockSupabase = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      }),
    }

    mockCreateClient.mockResolvedValue(mockSupabase)
    mockHashSecret.mockReturnValue("hashed_secret")

    const result = await validateBearerToken("alive_test_key", "wf_test_123")

    expect(result).toBe(false)
  })

  it("should handle exceptions gracefully and log them", async () => {
    mockCreateClient.mockRejectedValue(new Error("Connection timeout"))
    mockHashSecret.mockReturnValue("hashed_secret")

    const result = await validateBearerToken("alive_test_key", "wf_test_123")

    expect(result).toBe(false)
    expect(mockLogException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        location: "/lib/mcp-invoke/auth:validateBearerToken",
      }),
    )
  })

  it("should return false for missing scopes field", async () => {
    const mockSupabase = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          clerk_id: "user_123",
          scopes: null,
          revoked_at: null,
        },
        error: null,
      }),
    }

    mockCreateClient.mockResolvedValue(mockSupabase)
    mockHashSecret.mockReturnValue("hashed_secret")

    const result = await validateBearerToken("alive_test_key", "wf_test_123")

    expect(result).toBe(false)
  })

  it("should return false for invalid scopes format", async () => {
    const mockSupabase = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          clerk_id: "user_123",
          scopes: "invalid",
          revoked_at: null,
        },
        error: null,
      }),
    }

    mockCreateClient.mockResolvedValue(mockSupabase)
    mockHashSecret.mockReturnValue("hashed_secret")

    const result = await validateBearerToken("alive_test_key", "wf_test_123")

    expect(result).toBe(false)
  })

  it("should return false for scopes with no valid permissions", async () => {
    const mockSupabase = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          clerk_id: "user_123",
          scopes: { other: "value" },
          revoked_at: null,
        },
        error: null,
      }),
    }

    mockCreateClient.mockResolvedValue(mockSupabase)
    mockHashSecret.mockReturnValue("hashed_secret")

    const result = await validateBearerToken("alive_test_key", "wf_test_123")

    expect(result).toBe(false)
  })
})
