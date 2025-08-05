import type { WorkflowConfig } from "@workflow/schema/workflow.types"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the constants module
vi.mock("@example/constants", () => ({
  CONFIG: {
    coordinationType: "sequential",
  },
}))

// Mock the runtime config
vi.mock("@utils/config/runtimeConfig", () => ({
  getSettings: vi.fn(),
  getModels: vi.fn(() => ({ default: "test-model" })),
}))

import { getModels, getSettings } from "@utils/config/runtimeConfig"
import { verifyHierarchicalStructure } from "../verifyHierarchical"

describe("verifyHierarchicalStructure", () => {
  // Exact workflow from the error message
  const problemWorkflow: WorkflowConfig = {
    entryNodeId: "test-node-1",
    nodes: [
      {
        nodeId: "test-node-1",
        description: "orchestrator",
        systemPrompt: "test",
        modelName: getModels().default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["data-processor"],
      },
      {
        nodeId: "data-processor",
        description: "worker",
        systemPrompt: "test",
        modelName: getModels().default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["bcorp-verifier"],
      },
      {
        nodeId: "bcorp-verifier",
        description: "worker",
        systemPrompt: "test",
        modelName: getModels().default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["bcorp-directory-search"],
      },
      {
        nodeId: "bcorp-directory-search",
        description: "worker",
        systemPrompt: "test",
        modelName: getModels().default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["end"],
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSettings).mockReturnValue({ coordinationType: "sequential" } as any)
  })

  it("should return empty array when coordinationType is sequential", async () => {
    // Default mock is sequential
    const result = await verifyHierarchicalStructure(problemWorkflow)
    expect(result).toEqual([])
  })

  it("should validate hierarchical structure correctly in hierarchical mode", async () => {
    // Mock hierarchical mode
    vi.mocked(getSettings).mockReturnValue({ coordinationType: "hierarchical" } as any)

    const result = await verifyHierarchicalStructure(problemWorkflow)
    // Should pass with our new logic that supports worker chains
    expect(result).toEqual([])
  })

  it("should detect invalid handoffs to non-existent nodes", async () => {
    // Mock hierarchical mode
    vi.mocked(getSettings).mockReturnValue({ coordinationType: "hierarchical" } as any)

    const invalidHandoffWorkflow: WorkflowConfig = {
      entryNodeId: "orchestrator",
      nodes: [
        {
          nodeId: "orchestrator",
          description: "orchestrator",
          systemPrompt: "test",
          modelName: getModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["worker1"],
        },
        {
          nodeId: "worker1",
          description: "worker",
          systemPrompt: "test",
          modelName: getModels().default,
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
