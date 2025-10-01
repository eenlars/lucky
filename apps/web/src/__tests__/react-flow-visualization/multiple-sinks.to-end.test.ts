import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { MODELS } from "@examples/settings/constants.client"
import { describe, expect, it, vi } from "vitest"
import { initialSetupConfig } from "@/react-flow-visualization/lib/workflow-data"

vi.mock("@/react-flow-visualization/components/nodes", () => ({
  createNodeByType: (args: any) => ({
    id: args.id,
    type: args.type,
    data: args.data ?? {},
    position: args.position ?? { x: 0, y: 0 },
  }),
}))

vi.mock("@examples/settings/constants.client", () => ({
  MODELS: { default: "openai/gpt-4o-mini" },
}))

// Prevent ELK worker usage during tests
vi.mock("@/react-flow-visualization/store/layout", () => ({
  layoutGraph: vi.fn(async (nodes: any) => nodes),
}))

describe("multiple sinks attach to a single end node", () => {
  it("routes multiple sink nodes to a single end node", () => {
    const cfg = {
      entryNodeId: "a",
      nodes: [
        {
          nodeId: "a",
          description: "A",
          systemPrompt: "",
          modelName: MODELS.default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["b"],
          memory: {},
        },
        {
          nodeId: "b",
          description: "B",
          systemPrompt: "",
          modelName: MODELS.default,
          mcpTools: [],
          codeTools: [],
          handOffs: [],
          memory: {},
        },
        {
          nodeId: "c",
          description: "C",
          systemPrompt: "",
          modelName: MODELS.default,
          mcpTools: [],
          codeTools: [],
          handOffs: [],
          memory: {},
        },
      ],
    } satisfies WorkflowConfig

    const { nodes, edges } = initialSetupConfig(cfg)
    const endNodes = nodes.filter(n => n.id === "end")
    expect(endNodes).toHaveLength(1)
    const pairs = edges.map(e => `${e.source}->${e.target}`)
    expect(pairs).toEqual(expect.arrayContaining(["start->a", "a->b", "b->end", "c->end"]))
  })

  it("does not duplicate end edge when handOffs already include end", () => {
    const cfg = {
      entryNodeId: "x",
      nodes: [
        {
          nodeId: "x",
          description: "",
          systemPrompt: "",
          modelName: MODELS.default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
          memory: {},
        },
      ],
    } satisfies WorkflowConfig

    const { nodes, edges } = initialSetupConfig(cfg)
    const endNodes = nodes.filter(n => n.id === "end")
    expect(endNodes).toHaveLength(1)
    const endPairs = edges.map(e => `${e.source}->${e.target}`).filter(p => p === "x->end")
    expect(endPairs).toHaveLength(1)
  })

  it.todo("reserve id 'end' so a user-defined nodeId 'end' does not create duplicate nodes")
})
