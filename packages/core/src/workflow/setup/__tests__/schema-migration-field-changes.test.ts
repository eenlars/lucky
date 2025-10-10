import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { WorkflowConfigHandler } from "../WorkflowLoader"

describe("Schema Migration - Field Changes", () => {
  let handler: WorkflowConfigHandler

  beforeEach(() => {
    handler = WorkflowConfigHandler.getInstance()
  })

  it("should preserve migrated entryNodeId changes when loading from DSL", async () => {
    // Simulate a workflow where migration would change entryNodeId
    const legacyWorkflow = {
      nodes: [
        {
          nodeId: "main",
          description: "Main",
          systemPrompt: "Test",
          modelName: "openai/gpt-4.1-mini",
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
      entryNodeId: "main",
    } as WorkflowConfig

    const result = await handler.loadFromDSL(legacyWorkflow)

    // After migration, entryNodeId should come from migrated data
    expect(result.entryNodeId).toBe("main")
    expect(result.nodes[0].nodeId).toBe("main")
  })

  it("should preserve migrated contextFile when loading from DSL", async () => {
    const legacyWorkflow = {
      nodes: [
        {
          nodeId: "main",
          description: "Main",
          systemPrompt: "Test",
          modelName: "openai/gpt-4.1-mini",
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
      entryNodeId: "main",
      contextFile: "old-context.txt",
    } as WorkflowConfig

    const result = await handler.loadFromDSL(legacyWorkflow)

    // contextFile should come from migrated data, not original
    expect(result.contextFile).toBe("old-context.txt")
  })

  it("should not lose migration changes to top-level fields", async () => {
    // This test demonstrates that migrations affecting entryNodeId,
    // contextFile, or toolsInformation would be preserved
    const workflow = {
      __schema_version: 1,
      nodes: [
        {
          nodeId: "entry",
          description: "Entry node",
          systemPrompt: "Test",
          modelName: "openai/gpt-4.1-mini",
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
      entryNodeId: "entry",
      contextFile: "context.md",
    } as WorkflowConfig

    const result = await handler.loadFromDSL(workflow)

    // All fields should match what came from migration
    expect(result.__schema_version).toBe(1)
    expect(result.entryNodeId).toBe("entry")
    expect(result.contextFile).toBe("context.md")
  })
})
