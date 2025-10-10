import * as coreConfig from "@core/core-config/coreConfig"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the constants module
vi.mock("@examples/constants", () => ({
  CONFIG: {
    coordinationType: "sequential",
    verification: {
      allowCycles: false,
      enableOutputValidation: false,
      maxFilesPerWorkflow: 1,
      enforceFileLimit: true,
    },
  },
}))

import { getDefaultModels } from "@core/core-config/compat"
import { everyNodeIsConnectedToStartNode, startNodeIsConnectedToEndNode } from "../connectionVerification"
import { verifyNoCycles } from "../verifyDirectedGraph"
import { getNodeRole, isOrchestrator, verifyHierarchicalStructure } from "../verifyHierarchical"

const defaultCoreConfig = coreConfig.getCoreConfig()

type ConfigOverrides = {
  coordinationType?: "sequential" | "hierarchical"
  allowCycles?: boolean
}

let configOverrides: ConfigOverrides = {}

const buildCoreConfig = () => {
  const hasCoordinationOverride = configOverrides.coordinationType !== undefined
  const hasAllowCyclesOverride = configOverrides.allowCycles !== undefined

  if (!hasCoordinationOverride && !hasAllowCyclesOverride) {
    return defaultCoreConfig
  }

  return {
    ...defaultCoreConfig,
    coordinationType: hasCoordinationOverride ? configOverrides.coordinationType! : defaultCoreConfig.coordinationType,
    verification: hasAllowCyclesOverride
      ? { ...defaultCoreConfig.verification, allowCycles: configOverrides.allowCycles! }
      : defaultCoreConfig.verification,
  }
}

const getCoreConfigSpy = vi.spyOn(coreConfig, "getCoreConfig").mockImplementation(buildCoreConfig)

const setCoordinationType = (coordinationType: "sequential" | "hierarchical") => {
  configOverrides = { ...configOverrides, coordinationType }
  getCoreConfigSpy.mockImplementation(buildCoreConfig)
}

const setAllowCycles = (allowCycles: boolean) => {
  configOverrides = { ...configOverrides, allowCycles }
  getCoreConfigSpy.mockImplementation(buildCoreConfig)
}

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
    configOverrides = {}
    vi.clearAllMocks()
    getCoreConfigSpy.mockImplementation(buildCoreConfig)
  })

  afterAll(() => {
    getCoreConfigSpy.mockRestore()
  })

  it("should return empty array when coordinationType is sequential", async () => {
    // Default mock is sequential
    const result = await verifyHierarchicalStructure(problemWorkflow)
    expect(result).toEqual([])
  })

  it("should validate hierarchical structure correctly in hierarchical mode", async () => {
    // Mock hierarchical mode
    setCoordinationType("hierarchical")

    const result = await verifyHierarchicalStructure(problemWorkflow)
    // Should pass with our new logic that supports worker chains
    expect(result).toEqual([])
  })

  it("should detect invalid handoffs to non-existent nodes", async () => {
    // Mock hierarchical mode
    setCoordinationType("hierarchical")

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

  // Test for circular dependencies
  it("should detect circular dependencies in workflow", () => {
    // Ensure cycles are not allowed for this test
    setAllowCycles(false)
    const circularWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "first node",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["node2"],
        },
        {
          nodeId: "node2",
          description: "second node",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["node3"],
        },
        {
          nodeId: "node3",
          description: "third node",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["node1"], // Creates cycle
        },
      ],
    }

    const result = verifyNoCycles(circularWorkflow)
    expect(result).toHaveLength(1)
    expect(result[0]).toContain("contains cycles")
  })

  // Test for self-referential nodes
  it("should detect self-referential nodes", () => {
    // Ensure cycles are not allowed for this test
    setAllowCycles(false)
    const selfRefWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "self-referencing node",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["node1", "end"], // Self-reference
        },
      ],
    }

    const result = verifyNoCycles(selfRefWorkflow)
    expect(result).toHaveLength(1)
    expect(result[0]).toContain("contains cycles")
  })

  // Test for orphaned nodes
  it("should detect orphaned nodes not reachable from entry", async () => {
    const orphanedWorkflow: WorkflowConfig = {
      entryNodeId: "orchestrator",
      nodes: [
        {
          nodeId: "orchestrator",
          description: "orchestrator",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["worker1", "end"],
        },
        {
          nodeId: "worker1",
          description: "connected worker",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
        {
          nodeId: "orphaned-node",
          description: "orphaned worker",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
    }

    const result = await everyNodeIsConnectedToStartNode(orphanedWorkflow)
    expect(result).toHaveLength(1)
    expect(result[0]).toContain("orphaned-node")
    expect(result[0]).toContain("not reachable")
  })

  // Test for multiple orchestrators (only entry should be orchestrator)
  it("should identify correct orchestrator in hierarchical mode", async () => {
    setCoordinationType("hierarchical")

    const workflow: WorkflowConfig = {
      entryNodeId: "main-orchestrator",
      nodes: [
        {
          nodeId: "main-orchestrator",
          description: "orchestrator",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["worker1", "worker2"],
        },
        {
          nodeId: "worker1",
          description: "worker",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
        {
          nodeId: "worker2",
          description: "worker",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
    }

    // Only entry node should be orchestrator
    expect(isOrchestrator("main-orchestrator", workflow)).toBe(true)
    expect(isOrchestrator("worker1", workflow)).toBe(false)
    expect(isOrchestrator("worker2", workflow)).toBe(false)

    // Check node roles
    expect(getNodeRole("main-orchestrator", workflow)).toBe("orchestrator")
    expect(getNodeRole("worker1", workflow)).toBe("worker")
    expect(getNodeRole("worker2", workflow)).toBe("worker")
  })

  // Test for complex branching hierarchies
  it("should handle complex branching hierarchies", async () => {
    setCoordinationType("hierarchical")

    const complexWorkflow: WorkflowConfig = {
      entryNodeId: "orchestrator",
      nodes: [
        {
          nodeId: "orchestrator",
          description: "main orchestrator",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["branch1-worker1", "branch2-worker1"],
        },
        {
          nodeId: "branch1-worker1",
          description: "branch 1 start",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["branch1-worker2"],
        },
        {
          nodeId: "branch1-worker2",
          description: "branch 1 end",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["merger"],
        },
        {
          nodeId: "branch2-worker1",
          description: "branch 2 start",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["branch2-worker2"],
        },
        {
          nodeId: "branch2-worker2",
          description: "branch 2 end",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["merger"],
        },
        {
          nodeId: "merger",
          description: "merge branches",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
    }

    const result = await verifyHierarchicalStructure(complexWorkflow)
    expect(result).toEqual([]) // Should be valid

    // Verify all nodes are reachable
    const connectionResult = await everyNodeIsConnectedToStartNode(complexWorkflow)
    expect(connectionResult).toEqual([])

    // Verify path to end exists
    const pathToEnd = await startNodeIsConnectedToEndNode(complexWorkflow)
    expect(pathToEnd).toEqual([])
  })

  // Test for worker nodes with multiple parents (diamond pattern)
  it("should handle diamond pattern (multiple parents)", async () => {
    const diamondWorkflow: WorkflowConfig = {
      entryNodeId: "orchestrator",
      nodes: [
        {
          nodeId: "orchestrator",
          description: "orchestrator",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["workerA", "workerB"],
        },
        {
          nodeId: "workerA",
          description: "worker A",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["workerC"],
        },
        {
          nodeId: "workerB",
          description: "worker B",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["workerC"],
        },
        {
          nodeId: "workerC",
          description: "worker C (multiple parents)",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
    }

    // Should handle diamond pattern correctly
    const hierarchicalResult = await verifyHierarchicalStructure(diamondWorkflow)
    expect(hierarchicalResult).toEqual([])

    // No cycles in diamond pattern
    const cycleResult = verifyNoCycles(diamondWorkflow)
    expect(cycleResult).toEqual([])
  })

  // Test for deeply nested hierarchies performance
  it("should handle deeply nested hierarchies efficiently", async () => {
    const depth = 20
    const nodes = []

    // Create a deep chain of nodes
    for (let i = 0; i < depth; i++) {
      nodes.push({
        nodeId: `node${i}`,
        description: i === 0 ? "orchestrator" : `worker level ${i}`,
        systemPrompt: "test",
        modelName: getDefaultModels().default,
        mcpTools: [],
        codeTools: [],
        handOffs: i < depth - 1 ? [`node${i + 1}`] : ["end"],
      })
    }

    const deepWorkflow: WorkflowConfig = {
      entryNodeId: "node0",
      nodes,
    }

    // Measure performance
    const startTime = performance.now()
    const cycleResult = verifyNoCycles(deepWorkflow)
    const connectionResult = await everyNodeIsConnectedToStartNode(deepWorkflow)
    const endTime = performance.now()

    expect(cycleResult).toEqual([])
    expect(connectionResult).toEqual([])

    // Should complete quickly even with deep nesting
    expect(endTime - startTime).toBeLessThan(100) // 100ms threshold
  })

  // Test when CONFIG allows cycles
  it("should skip cycle validation when allowCycles is true", () => {
    setAllowCycles(true)

    const circularWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "node",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["node2"],
        },
        {
          nodeId: "node2",
          description: "node",
          systemPrompt: "test",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["node1"], // Cycle
        },
      ],
    }

    const result = verifyNoCycles(circularWorkflow)
    expect(result).toEqual([]) // Should allow cycles when configured
  })
})
