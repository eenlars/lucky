import { describe, expect, it } from "vitest"

import { getDefaultModels } from "@core/core-config/compat"
import { hashWorkflow, hashWorkflowNode } from "@core/workflow/schema/hash"
import type { WorkflowConfig, WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"

function makeNode(overrides: Partial<WorkflowNodeConfig> = {}): WorkflowNodeConfig {
  const base: WorkflowNodeConfig = {
    nodeId: "node-1",
    description: "Test Node",
    systemPrompt: "Do things",
    modelName: getDefaultModels().medium,
    mcpTools: [],
    codeTools: [],
    handOffs: [],
    memory: { a: "1" },
  }
  return { ...base, ...overrides }
}

function makeWorkflow(overrides: Partial<WorkflowConfig> = {}): WorkflowConfig {
  const base: WorkflowConfig = {
    entryNodeId: "node-1",
    nodes: [makeNode()],
    memory: { global: "x" },
  }
  return { ...base, ...overrides }
}

describe("hashing utilities", () => {
  it("hashWorkflowNode should be deterministic, sort keys, and omit memory", () => {
    const nodeA: WorkflowNodeConfig = makeNode({
      // intentionally different key order via separate creation
      nodeId: "node-1",
      description: "Test Node",
      systemPrompt: "Do things",
      modelName: getDefaultModels().medium,
      mcpTools: [],
      codeTools: [],
      handOffs: ["end"],
      memory: { foo: "bar" },
    })

    const nodeB: WorkflowNodeConfig = {
      // different literal order and different memory should not affect hash
      systemPrompt: "Do things",
      description: "Test Node",
      handOffs: ["end"],
      mcpTools: [],
      codeTools: [],
      modelName: getDefaultModels().medium,
      nodeId: "node-1",
      memory: { foo: "DIFFERENT" },
    }

    const hashA = hashWorkflowNode(nodeA)
    const hashB = hashWorkflowNode(nodeB)
    expect(hashA).toBe(hashB)

    const changed = makeNode({
      systemPrompt: "Do other things",
      handOffs: ["end"],
    })
    const hashChanged = hashWorkflowNode(changed)
    expect(hashChanged).not.toBe(hashA)
  })

  it("hashWorkflow should omit node memory but include workflow-level memory", () => {
    const base = makeWorkflow({
      nodes: [
        makeNode({ nodeId: "a", handOffs: ["b"], memory: { x: "1" } }),
        makeNode({ nodeId: "b", handOffs: [], memory: { y: "2" } }),
      ],
      memory: { global: "one" },
    })

    // Change only node-level memory → hash should stay the same
    const changedNodeMemory: WorkflowConfig = {
      ...base,
      nodes: [
        { ...base.nodes[0], memory: { x: "DIFF" } },
        { ...base.nodes[1], memory: undefined },
      ] as WorkflowNodeConfig[],
    }

    const h1 = hashWorkflow(base)
    const h2 = hashWorkflow(changedNodeMemory)
    expect(h1).toBe(h2)

    // Change workflow-level memory → hash should change
    const changedWorkflowMemory = { ...base, memory: { global: "two" } }
    const h3 = hashWorkflow(changedWorkflowMemory)
    expect(h3).not.toBe(h1)
  })

  it("hashWorkflow should be stable across object key order differences", () => {
    const cfg1: WorkflowConfig = {
      entryNodeId: "start",
      nodes: [
        {
          nodeId: "n1",
          description: "A",
          systemPrompt: "p",
          modelName: getDefaultModels().medium,
          mcpTools: [],
          codeTools: [],
          handOffs: ["n2"],
          memory: { z: "1" },
        },
        {
          nodeId: "n2",
          description: "B",
          systemPrompt: "p2",
          modelName: getDefaultModels().medium,
          mcpTools: [],
          codeTools: [],
          handOffs: [],
          memory: { z: "2" },
        },
      ],
      memory: { g: "v" },
    }

    const node2 = {
      // shuffled property order compared to cfg1.nodes[0]
      systemPrompt: "p",
      description: "A",
      handOffs: ["n2"],
      mcpTools: [],
      codeTools: [],
      modelName: getDefaultModels().medium,
      nodeId: "n1",
      memory: { z: "DIFF" },
    } as WorkflowNodeConfig

    const cfg2: WorkflowConfig = {
      nodes: [node2, cfg1.nodes[1]],
      entryNodeId: "start",
      memory: { g: "v" },
    }

    expect(hashWorkflow(cfg1)).toBe(hashWorkflow(cfg2))
  })

  it("node hash: missing vs undefined vs null memory should be identical", () => {
    const a = makeNode({ memory: undefined })
    const b = makeNode({}) // omitted
    const c = makeNode({ memory: null as any })

    // hashWorkflowNode omits memory entirely, so all should be equal
    expect(hashWorkflowNode(a)).toBe(hashWorkflowNode(b))
    expect(hashWorkflowNode(b)).toBe(hashWorkflowNode(c))
  })

  it("workflow hash: node memory variants do not affect hash, but workflow memory does", () => {
    const base = makeWorkflow({
      nodes: [
        makeNode({ nodeId: "a", handOffs: ["b"], memory: { x: "1" } }),
        makeNode({ nodeId: "b", handOffs: [], memory: undefined }),
      ],
      memory: { g: "v" },
    })

    const v1 = hashWorkflow(base)
    const v2 = hashWorkflow({
      ...base,
      nodes: [
        { ...base.nodes[0], memory: null as any },
        { ...base.nodes[1], memory: { something: "else" } as any },
      ] as WorkflowNodeConfig[],
    })
    expect(v2).toBe(v1)

    const v3 = hashWorkflow({ ...base, memory: { g: "vv" } })
    expect(v3).not.toBe(v1)
  })

  it("node hash: array order does not matter for string arrays", () => {
    const n1 = makeNode({
      handOffs: ["a", "b", "c"],
      mcpTools: ["t2", "t1" as any],
      codeTools: ["c2", "c1" as any],
      waitFor: ["x", "y"],
    })
    const n2 = makeNode({
      handOffs: ["c", "b", "a"],
      mcpTools: ["t1", "t2" as any],
      codeTools: ["c1", "c2" as any],
      waitFor: ["y", "x"],
    })
    expect(hashWorkflowNode(n1)).toBe(hashWorkflowNode(n2))
  })

  it("workflow hash: nodes order does not matter (sorted by nodeId)", () => {
    const w1 = makeWorkflow({
      nodes: [makeNode({ nodeId: "a", handOffs: ["b"] }), makeNode({ nodeId: "b", handOffs: [] })],
    })
    const w2 = makeWorkflow({
      nodes: [makeNode({ nodeId: "b", handOffs: [] }), makeNode({ nodeId: "a", handOffs: ["b"] })],
    })
    expect(hashWorkflow(w1)).toBe(hashWorkflow(w2))
  })

  it("node hash: array order normalization with duplicates", () => {
    const n1 = makeNode({
      handOffs: ["a", "b", "a", "c"],
      mcpTools: ["t2", "t1", "t1"] as any,
      codeTools: ["c2", "c1", "c1"] as any,
      waitFor: ["x", "y", "x"],
    })
    const n2 = makeNode({
      handOffs: ["c", "a", "b", "a"],
      mcpTools: ["t1", "t2", "t1"] as any,
      codeTools: ["c1", "c1", "c2"] as any,
      waitFor: ["y", "x", "x"],
    })
    expect(hashWorkflowNode(n1)).toBe(hashWorkflowNode(n2))
  })

  it("node hash: waitingFor order does not matter", () => {
    const n1 = makeNode({ waitingFor: ["alpha", "beta"] })
    const n2 = makeNode({ waitingFor: ["beta", "alpha"] })
    expect(hashWorkflowNode(n1)).toBe(hashWorkflowNode(n2))
  })

  it("workflow hash: node sorting stable across multiple permutations", () => {
    const a = makeNode({ nodeId: "a", handOffs: ["b"], description: "A" })
    const b = makeNode({ nodeId: "b", handOffs: ["c"], description: "B" })
    const c = makeNode({ nodeId: "c", handOffs: [], description: "C" })

    const w1 = makeWorkflow({ nodes: [a, b, c] })
    const w2 = makeWorkflow({ nodes: [c, b, a] })
    const w3 = makeWorkflow({ nodes: [b, a, c] })
    const h1 = hashWorkflow(w1)
    const h2 = hashWorkflow(w2)
    const h3 = hashWorkflow(w3)
    expect(h1).toBe(h2)
    expect(h2).toBe(h3)
  })

  it("node hash: waitFor and waitingFor are normalized (merged and sorted unique)", () => {
    const a = makeNode({ waitFor: ["x", "y"], waitingFor: undefined as any })
    const b = makeNode({ waitingFor: ["y", "x"], waitFor: undefined as any })
    const c = makeNode({ waitFor: ["x"], waitingFor: ["y", "x"] })
    expect(hashWorkflowNode(a)).toBe(hashWorkflowNode(b))
    expect(hashWorkflowNode(b)).toBe(hashWorkflowNode(c))
  })

  it("workflow hash: contextFile null vs omitted yields different hashes", () => {
    const a = makeWorkflow({ contextFile: undefined })
    const b = makeWorkflow({}) // omitted
    const c = makeWorkflow({ contextFile: null })

    // undefined vs omitted → same
    expect(hashWorkflow(a)).toBe(hashWorkflow(b))
    // null is serialized, so it should differ
    expect(hashWorkflow(c)).not.toBe(hashWorkflow(a))
  })

  it("workflow hash: object key sorting applies recursively (toolsInformation)", () => {
    const toolsA = { z: 1, a: 2, nested: { b: 2, a: 1 } }
    const toolsB = { a: 2, nested: { a: 1, b: 2 }, z: 1 }

    const w1 = makeWorkflow({ toolsInformation: toolsA as any })
    const w2 = makeWorkflow({ toolsInformation: toolsB as any })

    expect(hashWorkflow(w1)).toBe(hashWorkflow(w2))
  })

  it("node hash: unknown extra fields are ignored via sanitization", () => {
    const base = makeNode()
    const altered = { ...(base as any), extra: "field" } as WorkflowNodeConfig
    expect(hashWorkflowNode(base)).toBe(hashWorkflowNode(altered))
  })
})
