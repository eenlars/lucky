import { describe, expect, it, vi } from "vitest"
import { initialSetupConfig } from "../../react-flow-visualization/lib/workflow-data"
vi.mock("@runtime/settings/constants.client", () => ({
  MODELS: { default: "gpt-4o-mini" },
}))

describe("workflow-data normalization", () => {
  it("converts legacy edges to handOffs and produces connected edges", () => {
    const legacy = {
      workflow: {
        nodes: [
          {
            nodeId: "a",
            description: "A",
            prompt: "p",
            tools: [],
            model: "gpt-4o-mini",
          },
          {
            nodeId: "b",
            description: "B",
            prompt: "p",
            tools: [],
            model: "gpt-4o-mini",
          },
        ],
        edges: [{ from: "a", to: "b" }],
        entryNodeId: "a",
      },
    }

    const { nodes, edges } = initialSetupConfig(legacy as any)
    // expect start,end + 2 nodes
    expect(nodes.map((n) => n.id).sort()).toEqual(
      ["a", "b", "end", "start"].sort()
    )
    // expect edge from start->entry and a->b
    const pairs = edges.map((e) => `${e.source}->${e.target}`)
    expect(pairs).toContain("start->a")
    expect(pairs).toContain("a->b")
  })

  it("accepts canonical config without edges array", () => {
    const canonical = {
      nodes: [
        {
          nodeId: "n1",
          description: "",
          systemPrompt: "",
          modelName: "gpt-4o-mini",
          mcpTools: [],
          codeTools: [],
          handOffs: ["n2"],
          memory: {},
        },
        {
          nodeId: "n2",
          description: "",
          systemPrompt: "",
          modelName: "gpt-4o-mini",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
          memory: {},
        },
      ],
      entryNodeId: "n1",
    }
    const { edges } = initialSetupConfig(canonical as any)
    const pairs = edges.map((e) => `${e.source}->${e.target}`)
    expect(pairs).toContain("start->n1")
    expect(pairs).toContain("n1->n2")
  })

  it("attaches sink nodes to end", () => {
    const canonical = {
      nodes: [
        {
          nodeId: "x",
          description: "",
          systemPrompt: "",
          modelName: "gpt-4o-mini",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
          memory: {},
        },
      ],
      entryNodeId: "x",
    }
    const { edges } = initialSetupConfig(canonical as any)
    const pairs = edges.map((e) => `${e.source}->${e.target}`)
    expect(pairs).toContain("start->x")
    expect(pairs).toContain("x->end")
  })
})
