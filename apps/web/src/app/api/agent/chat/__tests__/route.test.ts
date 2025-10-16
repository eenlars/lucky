import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRequireAuth = vi.hoisted(() => vi.fn())
const mockGetFacade = vi.hoisted(() => vi.fn())

vi.mock("@/lib/api-auth", () => ({
  requireAuthWithApiKey: mockRequireAuth,
}))

vi.mock("@lucky/models", async () => {
  const actual = await vi.importActual<typeof import("@lucky/models")>("@lucky/models")
  return {
    ...actual,
    getFacade: mockGetFacade,
  }
})

import { POST } from "../route"

describe("POST /api/agent/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects requests with invalid JSON", async () => {
    mockRequireAuth.mockResolvedValue("user-123")

    const request = new NextRequest("http://localhost/api/agent/chat", {
      method: "POST",
      body: "invalid json{",
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe("Invalid JSON in request body")
  })

  it("validates required fields", async () => {
    mockRequireAuth.mockResolvedValue("user-123")

    const request = new NextRequest("http://localhost/api/agent/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [],
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain("At least one message is required")
  })

  it("validates nodeId presence", async () => {
    mockRequireAuth.mockResolvedValue("user-123")

    const request = new NextRequest("http://localhost/api/agent/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            id: "1",
            role: "user",
            parts: [{ type: "text", text: "Hello" }],
          },
        ],
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.field).toBe("nodeId")
  })

  it("enforces message array max length", async () => {
    mockRequireAuth.mockResolvedValue("user-123")

    const tooManyMessages = Array.from({ length: 101 }, (_, i) => ({
      id: `${i}`,
      role: "user" as const,
      parts: [{ type: "text", text: `Message ${i}` }],
    }))

    const request = new NextRequest("http://localhost/api/agent/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: tooManyMessages,
        nodeId: "test-node-123",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain("Too many messages")
  })

  it("validates systemPrompt max length", async () => {
    mockRequireAuth.mockResolvedValue("user-123")

    const longPrompt = "a".repeat(10001)

    const request = new NextRequest("http://localhost/api/agent/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            id: "1",
            role: "user",
            parts: [{ type: "text", text: "Hello" }],
          },
        ],
        nodeId: "test-node-123",
        systemPrompt: longPrompt,
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain("System prompt is too long")
  })
})
