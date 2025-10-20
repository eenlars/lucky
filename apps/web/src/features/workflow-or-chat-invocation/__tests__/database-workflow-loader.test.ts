import type { Principal } from "@/lib/auth/principal"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { ErrorCodes } from "@lucky/shared/contracts/invoke"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { getDemoWorkflow, loadWorkflowConfig } from "../lib/config-load/database-workflow-loader"

// Mock dependencies
vi.mock("@/lib/data/workflow-repository", () => ({
  fetchWorkflowVersion: vi.fn(),
  fetchWorkflowWithVersions: vi.fn(),
}))

vi.mock("@/lib/error-logger", () => ({
  logException: vi.fn(),
}))

describe("getDemoWorkflow", () => {
  it("should return demo workflow with correct structure", () => {
    const result = getDemoWorkflow()

    expect(result.success).toBe(true)
    expect(result.source?.kind).toBe("dsl")
    expect(result.config).toBeDefined()
    expect(result.config?.__schema_version).toBe(1)
    expect(result.config?.entryNodeId).toBe("assistant")
    expect(result.config?.nodes.length).toBe(1)
  })

  it("should include input and output schemas", () => {
    const result = getDemoWorkflow()

    expect(result.inputSchema).toBeDefined()
    expect(result.outputSchema).toBeDefined()
    expect(result.config?.inputSchema).toBeDefined()
    expect(result.config?.outputSchema).toBeDefined()
  })

  it("should have a valid assistant node", () => {
    const result = getDemoWorkflow()

    const node = result.config?.nodes[0]
    expect(node?.nodeId).toBe("assistant")
    expect(node?.modelName).toBe("openrouter#openai/gpt-4o-mini")
    expect(node?.description).toBeTruthy()
    expect(node?.systemPrompt).toBeTruthy()
  })
})

describe("loadWorkflowConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return demo workflow for 'wf_demo'", async () => {
    const result = await loadWorkflowConfig("wf_demo")

    expect(result.success).toBe(true)
    expect(result.source?.kind).toBe("dsl")
    expect(result.config).toBeDefined()
  })

  it("should return demo workflow for 'demo'", async () => {
    const result = await loadWorkflowConfig("demo")

    expect(result.success).toBe(true)
    expect(result.source?.kind).toBe("dsl")
  })

  it("should load workflow by version ID", async () => {
    const { fetchWorkflowVersion } = await import("@/lib/data/workflow-repository")

    const mockConfig: WorkflowConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
    }

    const mockData = {
      wf_version_id: "wf_ver_abc123",
      workflow_id: "wf_123",
      dsl: mockConfig,
    }

    vi.mocked(fetchWorkflowVersion).mockResolvedValue({
      data: mockData,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    })

    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const result = await loadWorkflowConfig("wf_ver_abc123", principal, "workflow_version")

    expect(result.success).toBe(true)
    expect(result.source?.kind).toBe("version")
    if (result.source?.kind === "version") {
      expect(result.source.id).toBe("wf_ver_abc123")
    }
    expect(result.config).toEqual(mockConfig)
    expect(result.resolvedWorkflowVersionId).toBe("wf_ver_abc123")
  })

  it("should load workflow by parent ID and resolve to latest version", async () => {
    const { fetchWorkflowWithVersions } = await import("@/lib/data/workflow-repository")

    const mockConfig: WorkflowConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
    }

    const mockData = {
      wf_id: "wf_parent123",
      clerk_id: "user_123",
      versions: [
        {
          wf_version_id: "wf_ver_old",
          dsl: { __schema_version: 1, entryNodeId: "old", nodes: [] },
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          wf_version_id: "wf_ver_latest",
          dsl: mockConfig,
          created_at: "2024-01-02T00:00:00Z",
        },
      ],
    }

    vi.mocked(fetchWorkflowWithVersions).mockResolvedValue({
      data: mockData,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    })

    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const result = await loadWorkflowConfig("wf_parent123", principal, "workflow_parent")

    expect(result.success).toBe(true)
    expect(result.source?.kind).toBe("version")
    if (result.source?.kind === "version") {
      expect(result.source.id).toBe("wf_ver_latest")
    }
    expect(result.config).toEqual(mockConfig)
    expect(result.resolvedWorkflowVersionId).toBe("wf_ver_latest")
  })

  it("should reject workflow_version mode with non-version ID", async () => {
    const result = await loadWorkflowConfig("wf_parent123", undefined, "workflow_version")

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.WORKFLOW_NOT_FOUND)
    expect(result.error?.message).toContain("Expected workflow version ID")
  })

  it("should reject workflow_parent mode with version ID", async () => {
    const result = await loadWorkflowConfig("wf_ver_abc123", undefined, "workflow_parent")

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.WORKFLOW_NOT_FOUND)
    expect(result.error?.message).toContain("Expected workflow parent ID")
  })

  it("should return demo on not found when option is true", async () => {
    const { fetchWorkflowVersion } = await import("@/lib/data/workflow-repository")

    vi.mocked(fetchWorkflowVersion).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 404,
      statusText: "Not Found",
    })

    const result = await loadWorkflowConfig("wf_ver_nonexistent", undefined, "workflow_version", {
      returnDemoOnNotFound: true,
    })

    expect(result.success).toBe(true)
    expect(result.source?.kind).toBe("dsl")
  })

  it("should return error on not found when option is false", async () => {
    const { fetchWorkflowVersion } = await import("@/lib/data/workflow-repository")

    vi.mocked(fetchWorkflowVersion).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 404,
      statusText: "Not Found",
    })

    const result = await loadWorkflowConfig("wf_ver_nonexistent", undefined, "workflow_version", {
      returnDemoOnNotFound: false,
    })

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.WORKFLOW_NOT_FOUND)
  })

  it("should return error for invalid workflow ID format", async () => {
    const result = await loadWorkflowConfig("invalid_format")

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.WORKFLOW_NOT_FOUND)
    expect(result.error?.message).toContain("Invalid workflow ID format")
  })

  it("should return demo for invalid format when option is true", async () => {
    const result = await loadWorkflowConfig("invalid_format", undefined, undefined, {
      returnDemoOnNotFound: true,
    })

    expect(result.success).toBe(true)
    expect(result.source?.kind).toBe("dsl")
  })

  it("should handle database error for version lookup", async () => {
    const { fetchWorkflowVersion } = await import("@/lib/data/workflow-repository")
    vi.mocked(fetchWorkflowVersion).mockResolvedValue({
      data: null,
      error: {
        message: "Database connection failed",
        details: "",
        hint: "",
        code: "PGRST",
        name: "Database connection failed",
      },
      count: null,
      status: 500,
      statusText: "Internal Server Error",
    })

    const result = await loadWorkflowConfig("wf_ver_abc123")

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.INTERNAL_ERROR)
  })

  it("should handle database error for parent lookup", async () => {
    const { fetchWorkflowWithVersions } = await import("@/lib/data/workflow-repository")
    vi.mocked(fetchWorkflowWithVersions).mockResolvedValue({
      data: null,
      error: {
        message: "Database connection failed",
        details: "",
        hint: "",
        code: "PGRST",
        name: "Database connection failed",
      },
      count: null,
      status: 500,
      statusText: "Internal Server Error",
    })

    const result = await loadWorkflowConfig("wf_parent123")

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.INTERNAL_ERROR)
  })

  it("should handle workflow with no versions", async () => {
    const { fetchWorkflowWithVersions } = await import("@/lib/data/workflow-repository")

    const mockData = {
      wf_id: "wf_parent123",
      clerk_id: "user_123",
      versions: [],
    }

    vi.mocked(fetchWorkflowWithVersions).mockResolvedValue({
      data: mockData,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    })

    const result = await loadWorkflowConfig("wf_parent123")

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.WORKFLOW_NOT_FOUND)
    expect(result.error?.message).toContain("No versions found")
  })

  it("should handle workflow with null versions array", async () => {
    const { fetchWorkflowWithVersions } = await import("@/lib/data/workflow-repository")

    const mockData = {
      wf_id: "wf_parent123",
      clerk_id: "user_123",
      versions: [],
    }

    vi.mocked(fetchWorkflowWithVersions).mockResolvedValue({
      data: mockData,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    })

    const result = await loadWorkflowConfig("wf_parent123")

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.WORKFLOW_NOT_FOUND)
  })

  it("should handle exception during load", async () => {
    const { fetchWorkflowVersion } = await import("@/lib/data/workflow-repository")
    vi.mocked(fetchWorkflowVersion).mockRejectedValue(new Error("Unexpected error"))

    const result = await loadWorkflowConfig("wf_ver_abc123")

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.INTERNAL_ERROR)
  })

  it("should extract input and output schemas from config", async () => {
    const { fetchWorkflowVersion } = await import("@/lib/data/workflow-repository")

    const mockConfig: WorkflowConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
      inputSchema: {
        type: "object",
        properties: { q: { type: "string" } },
      },
      outputSchema: {
        type: "object",
        properties: { a: { type: "string" } },
      },
    }

    vi.mocked(fetchWorkflowVersion).mockResolvedValue({
      data: {
        workflow_id: "wf_123",
        dsl: mockConfig,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    })

    const result = await loadWorkflowConfig("wf_ver_abc")

    expect(result.inputSchema).toEqual(mockConfig.inputSchema)
    expect(result.outputSchema).toEqual(mockConfig.outputSchema)
  })
})
