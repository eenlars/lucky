import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockAuthenticateRequest = vi.hoisted(() => vi.fn())
const mockCreateRLSClient = vi.hoisted(() => vi.fn())
const mockLogException = vi.hoisted(() => vi.fn())

vi.mock("@/lib/auth/principal", () => ({
  authenticateRequest: mockAuthenticateRequest,
}))

vi.mock("@/lib/supabase/server-rls", () => ({
  createRLSClient: mockCreateRLSClient,
}))

vi.mock("@/lib/error-logger", () => ({
  logException: mockLogException,
}))

vi.mock("@/lib/mcp-invoke/workflow-loader", () => ({
  getDemoWorkflow: vi.fn(() => ({
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
  })),
}))

import { GET } from "../route"

describe("GET /api/user/workflows", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 without authentication", async () => {
    mockAuthenticateRequest.mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/user/workflows")
    const response = await GET(request)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns workflows with latest version schemas", async () => {
    mockAuthenticateRequest.mockResolvedValue({
      clerk_id: "user_123",
      scopes: ["*"],
      auth_method: "session",
    })

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            wf_id: "wf_test_workflow",
            description: "Test workflow description",
            created_at: "2025-01-01T00:00:00Z",
            versions: [
              {
                wf_version_id: "wf_ver_v1",
                dsl: {
                  nodes: [],
                  entryNodeId: "test",
                  inputSchema: {
                    type: "object",
                    properties: {
                      input: { type: "string" },
                    },
                  },
                  outputSchema: {
                    type: "object",
                    properties: {
                      output: { type: "string" },
                    },
                  },
                },
                created_at: "2025-01-01T00:00:00Z",
              },
            ],
          },
        ],
        error: null,
      }),
    }

    mockCreateRLSClient.mockResolvedValue(mockSupabase as any)

    const request = new NextRequest("http://localhost/api/user/workflows")
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({
      workflow_id: "wf_test_workflow",
      name: "wf_test_workflow",
      description: "Test workflow description",
      created_at: "2025-01-01T00:00:00Z",
    })
    expect(body[0].inputSchema).toMatchObject({
      type: "object",
      properties: {
        input: { type: "string" },
      },
    })
    expect(body[0].outputSchema).toMatchObject({
      type: "object",
      properties: {
        output: { type: "string" },
      },
    })
  })

  it("returns demo workflow when user has no workflows", async () => {
    mockAuthenticateRequest.mockResolvedValue({
      clerk_id: "user_123",
      scopes: ["*"],
      auth_method: "session",
    })

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }

    mockCreateRLSClient.mockResolvedValue(mockSupabase as any)

    const request = new NextRequest("http://localhost/api/user/workflows")
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(1)
    expect(body[0].workflow_id).toBe("wf_demo")
  })

  it("returns latest version when multiple versions exist", async () => {
    mockAuthenticateRequest.mockResolvedValue({
      clerk_id: "user_123",
      scopes: ["*"],
      auth_method: "session",
    })

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            wf_id: "wf_test",
            description: "Test",
            created_at: "2025-01-01T00:00:00Z",
            versions: [
              {
                wf_version_id: "wf_ver_v1",
                dsl: {
                  nodes: [],
                  entryNodeId: "test",
                  inputSchema: { type: "object", properties: { old: { type: "string" } } },
                },
                created_at: "2025-01-01T00:00:00Z",
              },
              {
                wf_version_id: "wf_ver_v2",
                dsl: {
                  nodes: [],
                  entryNodeId: "test",
                  inputSchema: { type: "object", properties: { new: { type: "string" } } },
                },
                created_at: "2025-01-02T00:00:00Z",
              },
            ],
          },
        ],
        error: null,
      }),
    }

    mockCreateRLSClient.mockResolvedValue(mockSupabase as any)

    const request = new NextRequest("http://localhost/api/user/workflows")
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body[0].inputSchema.properties).toHaveProperty("new")
    expect(body[0].inputSchema.properties).not.toHaveProperty("old")
  })

  it("handles database errors", async () => {
    mockAuthenticateRequest.mockResolvedValue({
      clerk_id: "user_123",
      scopes: ["*"],
      auth_method: "session",
    })

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
      }),
    }

    mockCreateRLSClient.mockResolvedValue(mockSupabase as any)

    const request = new NextRequest("http://localhost/api/user/workflows")
    const response = await GET(request)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe("Database connection failed")
  })

  it("handles unexpected errors gracefully", async () => {
    mockAuthenticateRequest.mockRejectedValue(new Error("Auth service down"))

    const request = new NextRequest("http://localhost/api/user/workflows")
    const response = await GET(request)

    expect(response.status).toBe(500)
    expect(mockLogException).toHaveBeenCalled()
  })

  it("supports API key authentication", async () => {
    mockAuthenticateRequest.mockResolvedValue({
      clerk_id: "user_123",
      scopes: ["*"],
      auth_method: "api_key",
    })

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }

    mockCreateRLSClient.mockResolvedValue(mockSupabase as any)

    const request = new NextRequest("http://localhost/api/user/workflows", {
      headers: {
        Authorization: "Bearer alive_test_key",
      },
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockAuthenticateRequest).toHaveBeenCalledWith(request)
  })
})
