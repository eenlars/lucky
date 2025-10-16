import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock dependencies - must be defined before vi.mock calls
vi.mock("@/lib/auth/principal", () => ({
  authenticateRequest: vi.fn(),
}))

vi.mock("@/lib/redis/workflow-state", () => ({
  getWorkflowState: vi.fn(),
  setWorkflowState: vi.fn(),
  publishCancellation: vi.fn(),
}))

vi.mock("@/lib/workflow/active-workflows", () => ({
  activeWorkflows: new Map(),
}))

vi.mock("@/lib/error-logger", () => ({
  logException: vi.fn(),
}))

import { authenticateRequest } from "@/lib/auth/principal"
import { logException } from "@/lib/error-logger"
import { getWorkflowState, publishCancellation, setWorkflowState } from "@/lib/redis/workflow-state"
import { activeWorkflows } from "@/lib/workflow/active-workflows"
import { POST } from "../route"

const mockAuthenticateRequest = vi.mocked(authenticateRequest)
const mockGetWorkflowState = vi.mocked(getWorkflowState)
const mockSetWorkflowState = vi.mocked(setWorkflowState)
const mockPublishCancellation = vi.mocked(publishCancellation)
const mockLogException = vi.mocked(logException)
const mockActiveWorkflows = activeWorkflows as Map<string, any>

describe("POST /api/workflow/cancel/[invocationId]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockActiveWorkflows.clear()
    mockAuthenticateRequest.mockResolvedValue({
      clerk_id: "user_123",
      scopes: ["*"],
      auth_method: "session",
    })
  })

  it("cancels a running workflow", async () => {
    const invocationId = "inv_test_123"
    const mockController = {
      abort: vi.fn(),
    }

    mockActiveWorkflows.set(invocationId, {
      state: "running",
      controller: mockController,
      createdAt: Date.now(),
    })

    mockGetWorkflowState.mockResolvedValue(null)
    mockSetWorkflowState.mockResolvedValue()
    mockPublishCancellation.mockResolvedValue(true)

    const request = new NextRequest(`http://localhost/api/workflow/cancel/${invocationId}`, {
      method: "POST",
    })

    const response = await POST(request, { params: Promise.resolve({ invocationId }) })

    expect(response.status).toBe(202)
    const body = await response.json()

    expect(body.status).toBe("cancelling")
    expect(body.invocationId).toBe(invocationId)
    expect(body.cancelRequestedAt).toBeDefined()
    expect(mockController.abort).toHaveBeenCalled()
    expect(mockSetWorkflowState).toHaveBeenCalled()
    expect(mockPublishCancellation).toHaveBeenCalledWith(invocationId)
  })

  it("returns not_found when workflow doesn't exist", async () => {
    const invocationId = "inv_nonexistent"

    mockGetWorkflowState.mockResolvedValue(null)

    const request = new NextRequest(`http://localhost/api/workflow/cancel/${invocationId}`, {
      method: "POST",
    })

    const response = await POST(request, { params: Promise.resolve({ invocationId }) })

    expect(response.status).toBe(202)
    const body = await response.json()

    expect(body.status).toBe("not_found")
    expect(body.invocationId).toBe(invocationId)
  })

  it("returns already_cancelled when workflow already cancelled", async () => {
    const invocationId = "inv_cancelled"

    mockGetWorkflowState.mockResolvedValue({
      state: "cancelled",
      cancelRequestedAt: 1234567890,
      createdAt: Date.now(),
      desired: "cancelled",
      startedAt: Date.now(),
    })

    const request = new NextRequest(`http://localhost/api/workflow/cancel/${invocationId}`, {
      method: "POST",
    })

    const response = await POST(request, { params: Promise.resolve({ invocationId }) })

    expect(response.status).toBe(202)
    const body = await response.json()

    expect(body.status).toBe("already_cancelled")
    expect(body.invocationId).toBe(invocationId)
    expect(body.cancelRequestedAt).toBe(1234567890)
  })

  it("returns cancelling when cancellation already in progress", async () => {
    const invocationId = "inv_cancelling"

    mockGetWorkflowState.mockResolvedValue({
      state: "cancelling",
      cancelRequestedAt: 1234567890,
      createdAt: Date.now(),
      desired: "cancelling",
      startedAt: Date.now(),
    })

    const request = new NextRequest(`http://localhost/api/workflow/cancel/${invocationId}`, {
      method: "POST",
    })

    const response = await POST(request, { params: Promise.resolve({ invocationId }) })

    expect(response.status).toBe(202)
    const body = await response.json()

    expect(body.status).toBe("cancelling")
    expect(body.invocationId).toBe(invocationId)
  })

  it("handles invalid invocationId", async () => {
    const request = new NextRequest("http://localhost/api/workflow/cancel/", {
      method: "POST",
    })

    const response = await POST(request, { params: Promise.resolve({ invocationId: "" }) })

    expect(response.status).toBe(202)
    const body = await response.json()

    expect(body.status).toBe("not_found")
  })

  it("returns 401 without authentication", async () => {
    mockAuthenticateRequest.mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/workflow/cancel/inv_test", {
      method: "POST",
    })

    const response = await POST(request, { params: Promise.resolve({ invocationId: "inv_test" }) })

    expect(response.status).toBe(401)
    const body = await response.json()

    expect(body.message).toBe("Unauthorized")
  })

  it("handles errors gracefully", async () => {
    const invocationId = "inv_error"
    mockGetWorkflowState.mockRejectedValue(new Error("Redis connection failed"))

    const request = new NextRequest(`http://localhost/api/workflow/cancel/${invocationId}`, {
      method: "POST",
    })

    const response = await POST(request, { params: Promise.resolve({ invocationId }) })

    expect(response.status).toBe(202)
    expect(mockLogException).toHaveBeenCalled()
  })

  it("supports API key authentication", async () => {
    mockAuthenticateRequest.mockResolvedValue({
      clerk_id: "user_123",
      scopes: ["*"],
      auth_method: "api_key",
    })

    const invocationId = "inv_test"
    mockGetWorkflowState.mockResolvedValue(null)

    const request = new NextRequest(`http://localhost/api/workflow/cancel/${invocationId}`, {
      method: "POST",
      headers: {
        Authorization: "Bearer alive_test_key",
      },
    })

    await POST(request, { params: Promise.resolve({ invocationId }) })

    expect(mockAuthenticateRequest).toHaveBeenCalledWith(request)
  })
})
