import { ErrorCodes } from "@lucky/shared/contracts/invoke"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock dependencies - must be defined before vi.mock calls
vi.mock("@/lib/supabase/server-rls", () => ({
  createRLSClient: vi.fn(),
}))

vi.mock("@/lib/error-logger", () => ({
  logException: vi.fn(),
}))

import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { loadWorkflowConfig } from "../workflow-loader"

const mockCreateRLSClient = vi.mocked(createRLSClient)
const mockLogException = vi.mocked(logException)

describe("loadWorkflowConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("workflow_version mode (wf_ver_*)", () => {
    it("loads workflow by version ID", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            wf_version_id: "wf_ver_abc123",
            dsl: {
              nodes: [{ nodeId: "test", description: "Test node" }],
              entryNodeId: "test",
              inputSchema: { type: "object", properties: { input: { type: "string" } } },
              outputSchema: { type: "object", properties: { output: { type: "string" } } },
            },
          },
          error: null,
        }),
      }

      mockCreateRLSClient.mockResolvedValue(mockSupabase as any)

      const result = await loadWorkflowConfig("wf_ver_abc123", undefined, "workflow_version")

      expect(result.success).toBe(true)
      expect(result.config).toBeDefined()
      expect(result.config?.entryNodeId).toBe("test")
      expect(result.inputSchema).toMatchObject({
        type: "object",
        properties: { input: { type: "string" } },
      })
      expect(result.outputSchema).toMatchObject({
        type: "object",
        properties: { output: { type: "string" } },
      })
    })

    it("returns error when version not found", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      mockCreateRLSClient.mockResolvedValue(mockSupabase as any)

      const result = await loadWorkflowConfig("wf_ver_nonexistent", undefined, "workflow_version")

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCodes.WORKFLOW_NOT_FOUND)
      expect(result.error?.message).toContain("not found")
    })

    it("enforces workflow_version mode - rejects wf_* ID", async () => {
      const result = await loadWorkflowConfig("wf_parent_123", undefined, "workflow_version")

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCodes.WORKFLOW_NOT_FOUND)
      expect(result.error?.message).toContain("Expected workflow version ID")
    })
  })

  describe("workflow_parent mode (wf_*)", () => {
    it("loads workflow by parent ID and resolves to latest version", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            wf_id: "wf_parent_123",
            versions: [
              {
                wf_version_id: "wf_ver_v1",
                dsl: {
                  nodes: [],
                  entryNodeId: "old",
                  inputSchema: { type: "object", properties: { old: { type: "string" } } },
                },
                created_at: "2025-01-01T00:00:00Z",
              },
              {
                wf_version_id: "wf_ver_v2",
                dsl: {
                  nodes: [],
                  entryNodeId: "new",
                  inputSchema: { type: "object", properties: { new: { type: "string" } } },
                },
                created_at: "2025-01-02T00:00:00Z",
              },
            ],
          },
          error: null,
        }),
      }

      mockCreateRLSClient.mockResolvedValue(mockSupabase as any)

      const result = await loadWorkflowConfig("wf_parent_123", undefined, "workflow_parent")

      expect(result.success).toBe(true)
      expect(result.config?.entryNodeId).toBe("new")
      expect(result.inputSchema?.properties).toHaveProperty("new")
    })

    it("returns error when parent workflow not found", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      mockCreateRLSClient.mockResolvedValue(mockSupabase as any)

      const result = await loadWorkflowConfig("wf_nonexistent", undefined, "workflow_parent")

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCodes.WORKFLOW_NOT_FOUND)
    })

    it("returns error when workflow has no versions", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            wf_id: "wf_empty",
            versions: [],
          },
          error: null,
        }),
      }

      mockCreateRLSClient.mockResolvedValue(mockSupabase as any)

      const result = await loadWorkflowConfig("wf_empty", undefined, "workflow_parent")

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain("No versions found")
    })

    it("enforces workflow_parent mode - rejects wf_ver_* ID", async () => {
      const result = await loadWorkflowConfig("wf_ver_abc123", undefined, "workflow_parent")

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCodes.WORKFLOW_NOT_FOUND)
      expect(result.error?.message).toContain("Expected workflow parent ID")
    })
  })

  describe("auto-detect mode (no mode specified)", () => {
    it("auto-detects wf_ver_* format", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            wf_version_id: "wf_ver_auto",
            dsl: {
              nodes: [],
              entryNodeId: "auto",
              inputSchema: {},
            },
          },
          error: null,
        }),
      }

      mockCreateRLSClient.mockResolvedValue(mockSupabase as any)

      const result = await loadWorkflowConfig("wf_ver_auto")

      expect(result.success).toBe(true)
      expect(result.config?.entryNodeId).toBe("auto")
    })

    it("auto-detects wf_* format", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            wf_id: "wf_auto",
            versions: [
              {
                wf_version_id: "wf_ver_v1",
                dsl: { nodes: [], entryNodeId: "auto", inputSchema: {} },
                created_at: "2025-01-01T00:00:00Z",
              },
            ],
          },
          error: null,
        }),
      }

      mockCreateRLSClient.mockResolvedValue(mockSupabase as any)

      const result = await loadWorkflowConfig("wf_auto")

      expect(result.success).toBe(true)
      expect(result.config?.entryNodeId).toBe("auto")
    })

    it("returns error for invalid format", async () => {
      const result = await loadWorkflowConfig("invalid_id_format")

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain("Invalid workflow ID format")
    })
  })

  describe("error handling", () => {
    it("handles database errors gracefully", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Connection timeout" },
        }),
      }

      mockCreateRLSClient.mockResolvedValue(mockSupabase as any)

      const result = await loadWorkflowConfig("wf_ver_test")

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCodes.WORKFLOW_NOT_FOUND)
    })

    it("handles unexpected exceptions", async () => {
      mockCreateRLSClient.mockRejectedValue(new Error("Network error"))

      const result = await loadWorkflowConfig("wf_ver_test")

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCodes.INTERNAL_ERROR)
      expect(mockLogException).toHaveBeenCalled()
    })
  })
})
