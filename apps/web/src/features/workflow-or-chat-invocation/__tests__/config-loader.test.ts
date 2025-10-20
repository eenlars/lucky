import type { InvocationInput } from "@lucky/core/workflow/runner/types"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { loadWorkflowConfigFromInput } from "../lib/config-load/config-loader"

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}))

// Mock database-workflow-loader
vi.mock("../lib/database-workflow-loader", () => ({
  loadWorkflowConfig: vi.fn(),
}))

describe("loadWorkflowConfigFromInput", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should load from dslConfig when provided", async () => {
    const mockConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          modelName: "openai#gpt-4o",
          description: "Test node",
          mcpTools: [],
          codeTools: [],
          systemPrompt: "test",
          handOffs: [],
          memory: {},
        },
      ],
    } satisfies WorkflowConfig

    const input = {
      source: { kind: "dsl", config: mockConfig },
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    } satisfies InvocationInput

    const result = await loadWorkflowConfigFromInput(input)

    expect(result.source).toBe("dsl")
    expect(result.config).toEqual(mockConfig)
  })

  it("should load from file when filename is provided", async () => {
    const { readFile } = await import("node:fs/promises")

    const mockConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
    } satisfies WorkflowConfig

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockConfig))

    const input: InvocationInput = {
      source: { kind: "filename", path: "/path/to/workflow.json" },
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    }

    const result = await loadWorkflowConfigFromInput(input)

    expect(result.source).toBe("file")
    expect(result.config).toEqual(mockConfig)
    expect(readFile).toHaveBeenCalledWith("/path/to/workflow.json", "utf-8")
  })

  it("should load from database when workflowVersionId is provided", async () => {
    const { loadWorkflowConfig } = await import("../lib/config-load/database-workflow-loader")

    const mockConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
    } satisfies WorkflowConfig

    vi.mocked(loadWorkflowConfig).mockResolvedValue({
      success: true,
      config: mockConfig,
      inputSchema: undefined,
      outputSchema: undefined,
    })

    const input: InvocationInput = {
      source: { kind: "version", id: "wf_ver_abc123" },
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    }

    const result = await loadWorkflowConfigFromInput(input)

    expect(result.source).toBe("database")
    expect(result.config).toEqual(mockConfig)
    expect(loadWorkflowConfig).toHaveBeenCalledWith("wf_ver_abc123")
  })

  it("should use dsl config when provided", async () => {
    const mockConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
    } satisfies WorkflowConfig

    const input: InvocationInput = {
      source: { kind: "dsl", config: mockConfig },
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    }

    const result = await loadWorkflowConfigFromInput(input)

    expect(result.source).toBe("dsl")
    expect(result.config).toEqual(mockConfig)
  })

  it("should load from filename", async () => {
    const { readFile } = await import("node:fs/promises")

    const mockConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
    } satisfies WorkflowConfig

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockConfig))

    const input: InvocationInput = {
      source: { kind: "filename", path: "/path/to/workflow.json" },
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    }

    const result = await loadWorkflowConfigFromInput(input)

    expect(result.source).toBe("file")
  })

  it("should return none when no config source is available", async () => {
    const input = {
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    }

    // @ts-expect-error - Intentionally testing edge case with no config source
    const result = await loadWorkflowConfigFromInput(input)

    expect(result.source).toBe("none")
    expect(result.config).toBeNull()
  })

  it("should handle file read errors gracefully", async () => {
    const { readFile } = await import("node:fs/promises")

    vi.mocked(readFile).mockRejectedValue(new Error("File not found"))

    const input: InvocationInput = {
      source: { kind: "filename", path: "/nonexistent/workflow.json" },
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    }

    const result = await loadWorkflowConfigFromInput(input)

    expect(result.source).toBe("none")
    expect(result.config).toBeNull()
  })

  it("should handle JSON parse errors gracefully", async () => {
    const { readFile } = await import("node:fs/promises")

    vi.mocked(readFile).mockResolvedValue("invalid json")

    const input: InvocationInput = {
      source: { kind: "filename", path: "/path/to/invalid.json" },
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    }

    const result = await loadWorkflowConfigFromInput(input)

    expect(result.source).toBe("none")
    expect(result.config).toBeNull()
  })

  it("should handle database load failure gracefully", async () => {
    const { loadWorkflowConfig } = await import("../lib/config-load/database-workflow-loader")

    vi.mocked(loadWorkflowConfig).mockResolvedValue({
      success: false,
      error: {
        code: 404,
        message: "Workflow not found",
      },
    })

    const input: InvocationInput = {
      source: { kind: "version", id: "wf_ver_nonexistent" },
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    }

    const result = await loadWorkflowConfigFromInput(input)

    expect(result.source).toBe("none")
    expect(result.config).toBeNull()
  })

  it("should handle database returning null config", async () => {
    const { loadWorkflowConfig } = await import("../lib/config-load/database-workflow-loader")

    vi.mocked(loadWorkflowConfig).mockResolvedValue({
      success: true,
      config: undefined,
    })

    const input: InvocationInput = {
      source: { kind: "version", id: "wf_ver_abc123" },
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    }

    const result = await loadWorkflowConfigFromInput(input)

    expect(result.source).toBe("none")
    expect(result.config).toBeNull()
  })

  it("should load complex workflow config from file", async () => {
    const { readFile } = await import("node:fs/promises")

    const mockConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          modelName: "openai#gpt-4o",
          description: "First node",
          mcpTools: [],
          codeTools: [],
          systemPrompt: "System prompt",
          handOffs: ["node2"],
          memory: {},
        },
        {
          nodeId: "node2",
          modelName: "groq#llama-3.1-8b",
          description: "Second node",
          mcpTools: [],
          codeTools: [],
          systemPrompt: "System prompt 2",
          handOffs: [],
          memory: {},
        },
      ],
      inputSchema: {
        type: "object",
        properties: {
          question: { type: "string" },
        },
      },
    } satisfies WorkflowConfig

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockConfig))

    const input: InvocationInput = {
      source: { kind: "filename", path: "/path/to/complex-workflow.json" },
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    }

    const result = await loadWorkflowConfigFromInput(input)

    expect(result.source).toBe("file")
    expect(result.config).toEqual(mockConfig)
    expect(result.config?.nodes.length).toBe(2)
  })
})
