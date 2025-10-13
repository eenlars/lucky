import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { CURRENT_SCHEMA_VERSION } from "@lucky/shared/contracts/workflow"
import { beforeEach, describe, expect, it } from "vitest"
import { WorkflowConfigHandler } from "../WorkflowLoader"

describe("Schema Migration End-to-End", () => {
  let handler: WorkflowConfigHandler

  beforeEach(() => {
    handler = WorkflowConfigHandler.getInstance()
  })

  it("should add __schema_version when loading legacy workflow from DSL", async () => {
    // Simulate a workflow created before schema versioning
    const legacyWorkflow = {
      nodes: [
        {
          nodeId: "main",
          description: "Main node",
          systemPrompt: "Test",
          modelName: "gpt-4.1-mini",
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
      entryNodeId: "main",
    } as WorkflowConfig

    const result = await handler.loadFromDSL(legacyWorkflow)

    // After migration, should have version set
    expect(result.__schema_version).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.nodes[0].nodeId).toBe("main")
  })

  it("should preserve __schema_version if already set", async () => {
    const versionedWorkflow = {
      __schema_version: 1,
      nodes: [
        {
          nodeId: "test",
          description: "Test",
          systemPrompt: "Test",
          modelName: "gpt-4.1-mini",
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
      entryNodeId: "test",
    } as WorkflowConfig

    const result = await handler.loadFromDSL(versionedWorkflow)

    expect(result.__schema_version).toBe(1)
  })

  it("should demonstrate version constant is accessible", () => {
    // This proves external code can check the current version
    expect(CURRENT_SCHEMA_VERSION).toBe(1)
    expect(typeof CURRENT_SCHEMA_VERSION).toBe("number")
  })
})
