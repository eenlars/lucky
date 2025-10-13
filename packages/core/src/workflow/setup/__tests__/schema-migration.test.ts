import type { IPersistence } from "@together/adapter-supabase"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { WorkflowConfigHandler } from "../WorkflowLoader"

describe("Workflow Schema Migration", () => {
  let handler: WorkflowConfigHandler
  let mockPersistence: IPersistence

  beforeEach(() => {
    handler = WorkflowConfigHandler.getInstance()
    mockPersistence = {
      loadWorkflowConfig: vi.fn(),
      loadWorkflowConfigForDisplay: vi.fn(),
    } as any
  })

  it("should migrate legacy workflow (no __schema_version) to version 1", async () => {
    // Legacy workflow without schema version
    const legacyWorkflow = {
      nodes: [
        {
          nodeId: "main",
          description: "Main node",
          systemPrompt: "Test prompt",
          modelName: "gpt-4.1-mini",
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
      entryNodeId: "main",
    }

    vi.mocked(mockPersistence.loadWorkflowConfig).mockResolvedValue(legacyWorkflow)

    const result = await handler.loadFromDatabase("test-id", mockPersistence)

    // Should have schema version added
    expect(result.__schema_version).toBe(1)
    expect(result.nodes[0].nodeId).toBe("main")
  })

  it("should not modify workflow already at version 1", async () => {
    const v1Workflow = {
      __schema_version: 1,
      nodes: [
        {
          nodeId: "main",
          description: "Main node",
          systemPrompt: "Test prompt",
          modelName: "gpt-4.1-mini",
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
      entryNodeId: "main",
    }

    vi.mocked(mockPersistence.loadWorkflowConfig).mockResolvedValue(v1Workflow)

    const result = await handler.loadFromDatabase("test-id", mockPersistence)

    expect(result.__schema_version).toBe(1)
  })

  it("should migrate through multiple versions when implemented", async () => {
    // This test demonstrates how future migrations will work
    // When we add v2, the migration chain will be:
    // v0 -> v1 -> v2
    //
    // Example migration for v1 -> v2:
    // if (version < 2) {
    //   migrated = {
    //     ...migrated,
    //     __schema_version: 2,
    //     nodes: migrated.nodes.map(node => ({
    //       ...node,
    //       tools: node.mcpTools,
    //       mcpTools: undefined,
    //     }))
    //   }
    // }

    const legacyWorkflow = {
      nodes: [
        {
          nodeId: "test",
          description: "test",
          systemPrompt: "test",
          modelName: "gpt-4.1-mini",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      entryNodeId: "test",
    }

    vi.mocked(mockPersistence.loadWorkflowConfig).mockResolvedValue(legacyWorkflow)

    const result = await handler.loadFromDatabase("test-id", mockPersistence)

    // Currently migrates to v1
    expect(result.__schema_version).toBe(1)
    // When v2 is added, this test should verify migration to v2
  })
})
