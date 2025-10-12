import { readFileSync } from "node:fs"
import { join } from "node:path"
import { envi } from "@/env.mjs"
import { Webhook } from "svix"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "../route"

// Mock Supabase
const mockUpsert = vi.fn()
const mockEq = vi.fn()

vi.mock("@/lib/supabase/standalone", () => ({
  createStandaloneClient: () => ({
    schema: () => ({
      from: () => ({
        upsert: mockUpsert,
        update: () => ({ eq: mockEq }),
      }),
    }),
  }),
}))

const WEBHOOK_SECRET = envi.CLERK_WEBHOOK_SECRET ?? envi.CLERK_SECRET_KEY

describe("Clerk Webhook Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default to successful responses
    mockUpsert.mockResolvedValue({ error: null })
    mockEq.mockResolvedValue({ error: null })
  })

  function createRequest(payload: object, signed = true): Request {
    const body = JSON.stringify(payload)
    const headers: Record<string, string> = { "content-type": "application/json" }

    if (signed) {
      const timestamp = new Date()
      const msgId = `msg_${Math.random().toString(36).substring(7)}`
      const signature = new Webhook(WEBHOOK_SECRET).sign(msgId, timestamp, body)

      headers["svix-id"] = msgId
      headers["svix-timestamp"] = Math.floor(timestamp.getTime() / 1000).toString()
      headers["svix-signature"] = signature
    }

    return new Request("http://localhost:3000/api/clerk/webhooks", {
      method: "POST",
      headers,
      body,
    })
  }

  function loadFixture(name: string) {
    return JSON.parse(readFileSync(join(__dirname, "resources", `${name}.json`), "utf-8"))
  }

  it("creates user on user.created", async () => {
    const response = await POST(createRequest(loadFixture("user-created")))

    expect(response.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        clerk_id: "user_2test123abc",
        email: "john.doe@example.com",
        display_name: "John Doe",
        status: "active",
        is_test_env: true,
      }),
      { onConflict: "clerk_id" },
    )
  })

  it("updates user on user.updated", async () => {
    const response = await POST(createRequest(loadFixture("user-updated")))

    expect(response.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "john.doe.updated@example.com",
        display_name: "John Doe-Updated",
      }),
      { onConflict: "clerk_id" },
    )
  })

  it("disables user on user.deleted", async () => {
    const response = await POST(createRequest(loadFixture("user-deleted")))

    expect(response.status).toBe(200)
    expect(mockEq).toHaveBeenCalledWith("clerk_id", "user_2test123abc")
  })

  it("rejects invalid signatures", async () => {
    const response = await POST(
      new Request("http://localhost/api/clerk/webhooks", {
        method: "POST",
        headers: {
          "svix-id": "invalid",
          "svix-timestamp": "123",
          "svix-signature": "v1,bad",
        },
        body: JSON.stringify(loadFixture("user-created")),
      }),
    )

    expect(response.status).toBe(400)
  })

  it("rejects missing headers", async () => {
    const response = await POST(createRequest(loadFixture("user-created"), false))

    expect(response.status).toBe(400)
  })

  it("handles database errors", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "DB failed" } })

    const response = await POST(createRequest(loadFixture("user-created")))

    expect(response.status).toBe(500)
  })
})
