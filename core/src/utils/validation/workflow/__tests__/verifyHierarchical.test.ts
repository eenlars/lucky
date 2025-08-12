import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the constants module
vi.mock("@runtime/constants", () => ({
  CONFIG: {
    coordinationType: "sequential",
  },
}))

import { getDefaultModels } from "@runtime/settings/models"
import { CONFIG } from "@runtime/settings/constants"
import { verifyHierarchicalStructure } from "../verifyHierarchical"

describe("verifyHierarchicalStructure", () => {
  // TODO: additional test coverage needed:
  // 1. no tests for circular dependencies in hierarchical mode
  // 2. no tests for orphaned nodes (nodes not reachable from entry)
  // 3. no tests for multiple orchestrators (invalid hierarchy)
  // 4. no tests for deeply nested hierarchies performance
  // 5. no tests for self-referential nodes
  // 6. no tests for complex branching hierarchies
  // 7. no tests for worker nodes with multiple parents
  // Exact workflow from the error message
  const problemWorkflow: WorkflowConfig = {
    entryNodeId: "test-node-1",
    nodes: [
      {
        nodeId: "test-node-1",
        description: "orchestrator",
        systemPrompt: "test",
        modelName: getDefaultModels().default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["data-processor"],
      },
      {
        nodeId: "data-processor",
        description: "worker",
        systemPrompt: "test",
        modelName: getDefaultModels().default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["bcorp-verifier"],
      },
      {
        nodeId: "bcorp-verifier",
        description: "worker",
        systemPrompt: "test",
        modelName: getDefaultModels().default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["bcorp-directory-search"],
      },
      {
        nodeId: "bcorp-directory-search",
        description: "worker",
        systemPrompt: "test",
        modelName: getDefaultModels().default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["end"],
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return empty array when coordinationType is sequential", async () => {
    // Default mock is sequential
    const result = await verifyHierarchicalStructure(problemWorkflow)
    expect(result).toEqual([])
  })

  it("should validate hierarchical structure correctly in hierarchical mode", async () => {
    // Mock hierarchical mode
    vi.mocked(CONFIG).coordinationType = "hierarchical"

    const result = await verifyHierarchicalStructure(problemWorkflow)
    // Should pass with our new logic that supports worker chains
    expect(result).toEqual([])
  })

  it("should detect invalid handoffs to non-existent nodes", async () => {
    // Mock hierarchical mode
    vi.mocked(CONFIG).coordinationType = "hierarchical"

    const invalidHandoffWorkflow: WorkflowConfig = {
      entryNodeId: "orchestrator",
      nodes: [
        {
          nodeId: "orchestrator",
          description: "orchestrator",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["worker1"],
        },
        {
          nodeId: "worker1",
          description: "worker",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["non-existent-node"],
        },
      ],
    }

    const result = await verifyHierarchicalStructure(invalidHandoffWorkflow)
    expect(result).toHaveLength(1)
    expect(result[0]).toContain("invalid handoff to non-existent node")
    expect(result[0]).toContain("non-existent-node")
  })
})
