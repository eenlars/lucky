import { ErrorCodes } from "@lucky/shared/contracts/invoke"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockFetchWorkflowVersion = vi.hoisted(() => vi.fn())
const mockFetchWorkflowWithVersions = vi.hoisted(() => vi.fn())
const mockLogException = vi.hoisted(() => vi.fn())

vi.mock("@/lib/data/workflow-repository", () => ({
  fetchWorkflowVersion: mockFetchWorkflowVersion,
  fetchWorkflowWithVersions: mockFetchWorkflowWithVersions,
}))

vi.mock("@/lib/error-logger", () => ({
  logException: mockLogException,
}))

import { loadWorkflowConfig } from "../workflow-loader"

type PgSingleResponse<T> = {
  data: T | null
  error: { message: string } | null
  status: number
  statusText: string
}

const pgSuccess = <T>(data: T | null): PgSingleResponse<T> => ({
  data,
  error: null,
  status: 200,
  statusText: "OK",
})

const pgFailure = (message: string): PgSingleResponse<never> => ({
  data: null,
  error: { message },
  status: 500,
  statusText: "ERROR",
})

describe("loadWorkflowConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchWorkflowVersion.mockReset()
    mockFetchWorkflowWithVersions.mockReset()
  })

  describe("workflow_version mode (wf_ver_*)", () => {
    it("loads workflow by version ID", async () => {
      mockFetchWorkflowVersion.mockResolvedValue(
        pgSuccess({
          workflow_id: "wf_parent_abc",
          dsl: {
            nodes: [{ nodeId: "test", description: "Test node" }],
            entryNodeId: "test",
            inputSchema: { type: "object", properties: { input: { type: "string" } } },
            outputSchema: { type: "object", properties: { output: { type: "string" } } },
          },
        }),
      )

      const result = await loadWorkflowConfig("wf_ver_abc123", undefined, "workflow_version")

      expect(mockFetchWorkflowVersion).toHaveBeenCalledWith("wf_ver_abc123", undefined)
      expect(result.success).toBe(true)
      expect(result.config?.entryNodeId).toBe("test")
      expect(result.inputSchema?.properties).toHaveProperty("input")
      expect(result.outputSchema?.properties).toHaveProperty("output")
    })

    it("returns error when version not found", async () => {
      mockFetchWorkflowVersion.mockResolvedValue(pgSuccess(null))

      const result = await loadWorkflowConfig("wf_ver_missing", undefined, "workflow_version")

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCodes.WORKFLOW_NOT_FOUND)
    })

    it("propagates repository errors", async () => {
      mockFetchWorkflowVersion.mockResolvedValue(pgFailure("Database error"))

      const result = await loadWorkflowConfig("wf_ver_error", undefined, "workflow_version")

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCodes.INTERNAL_ERROR)
      expect(mockLogException).toHaveBeenCalled()
    })

    it("rejects wf_* IDs in workflow_version mode", async () => {
      const result = await loadWorkflowConfig("wf_parent_123", undefined, "workflow_version")

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain("Expected workflow version ID")
    })
  })

  describe("workflow_parent mode (wf_*)", () => {
    it("loads workflow and resolves latest version", async () => {
      mockFetchWorkflowWithVersions.mockResolvedValue(
        pgSuccess({
          wf_id: "wf_parent_123",
          clerk_id: "user_123",
          versions: [
            {
              wf_version_id: "wf_ver_v1",
              dsl: {
                nodes: [],
                entryNodeId: "old",
                inputSchema: { type: "object", properties: { old: { type: "string" } } },
                outputSchema: { type: "object", properties: { oldOut: { type: "string" } } },
              },
              created_at: "2025-01-01T00:00:00Z",
            },
            {
              wf_version_id: "wf_ver_v2",
              dsl: {
                nodes: [],
                entryNodeId: "new",
                inputSchema: { type: "object", properties: { newer: { type: "string" } } },
                outputSchema: { type: "object", properties: { newerOut: { type: "string" } } },
              },
              created_at: "2025-01-02T00:00:00Z",
            },
          ],
        }),
      )

      const result = await loadWorkflowConfig("wf_parent_123", undefined, "workflow_parent")

      expect(mockFetchWorkflowWithVersions).toHaveBeenCalledWith("wf_parent_123", undefined)
      expect(result.success).toBe(true)
      expect(result.config?.entryNodeId).toBe("new")
      expect(result.inputSchema?.properties).toHaveProperty("newer")
    })

    it("returns error when workflow not found", async () => {
      mockFetchWorkflowWithVersions.mockResolvedValue(pgSuccess(null))

      const result = await loadWorkflowConfig("wf_missing", undefined, "workflow_parent")

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCodes.WORKFLOW_NOT_FOUND)
    })

    it("propagates repository errors", async () => {
      mockFetchWorkflowWithVersions.mockResolvedValue(pgFailure("Database error"))

      const result = await loadWorkflowConfig("wf_error", undefined, "workflow_parent")

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCodes.INTERNAL_ERROR)
      expect(mockLogException).toHaveBeenCalled()
    })

    it("rejects wf_ver_* IDs in workflow_parent mode", async () => {
      const result = await loadWorkflowConfig("wf_ver_abc123", undefined, "workflow_parent")

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain("Expected workflow parent ID")
    })

    it("returns error when no versions exist", async () => {
      mockFetchWorkflowWithVersions.mockResolvedValue(
        pgSuccess({
          wf_id: "wf_empty",
          clerk_id: "user_123",
          versions: [],
        }),
      )

      const result = await loadWorkflowConfig("wf_empty", undefined, "workflow_parent")

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain("No versions found")
    })
  })

  describe("auto-detect mode", () => {
    it("detects wf_ver_* IDs", async () => {
      mockFetchWorkflowVersion.mockResolvedValue(
        pgSuccess({
          workflow_id: "wf_parent_auto",
          dsl: {
            nodes: [],
            entryNodeId: "auto",
            inputSchema: {},
          },
        }),
      )

      const result = await loadWorkflowConfig("wf_ver_auto")

      expect(result.success).toBe(true)
      expect(result.config?.entryNodeId).toBe("auto")
    })

    it("falls back to workflow lookup for wf_* IDs", async () => {
      mockFetchWorkflowWithVersions.mockResolvedValue(
        pgSuccess({
          wf_id: "wf_parent_auto",
          clerk_id: "user_123",
          versions: [
            {
              wf_version_id: "wf_ver_parent",
              dsl: { nodes: [], entryNodeId: "parent" },
              created_at: "2025-01-01T00:00:00Z",
            },
          ],
        }),
      )

      const result = await loadWorkflowConfig("wf_parent_auto")

      expect(result.success).toBe(true)
      expect(result.config?.entryNodeId).toBe("parent")
    })

    it("returns error for invalid format", async () => {
      const result = await loadWorkflowConfig("invalid_id_format")

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain("Invalid workflow ID format")
    })
  })
})
