import { initialSetupConfig } from "@/features/react-flow-visualization/lib/workflow-data"
import { type WorkflowConfig, toWorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { MODELS } from "@lucky/examples/settings/constants.client"
import { describe, expect, it, vi } from "vitest"
vi.mock("@/react-flow-visualization/components/nodes", () => ({
  createNodeByType: (args: any) => ({
    id: args.id,
    type: args.type,
    data: args.data ?? {},
    position: args.position ?? { x: 0, y: 0 },
  }),
}))

// Mock runtime-only imports that node/vitest cannot resolve in this test scope
vi.mock("@lucky/examples/settings/constants.client", () => ({
  MODELS: { default: "openrouter#openai/gpt-4o-mini" },
}))

describe("create graph from JSON (typed)", () => {
  it("produces nodes and edges that respect entry and handoffs", () => {
    const json: WorkflowConfig = {
      entryNodeId: "a",
      nodes: [
        {
          nodeId: "a",
          description: "A",
          systemPrompt: "p",
          modelName: MODELS.default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["b"],
          memory: {},
        },
        {
          nodeId: "b",
          description: "B",
          systemPrompt: "p",
          modelName: MODELS.default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
          memory: {},
        },
      ],
    }

    const cfg = toWorkflowConfig(json)!
    const { nodes, edges } = initialSetupConfig(cfg)

    // Assert start/end exist plus workflow nodes
    const nodeIds = nodes.map(n => n.id)
    expect(nodeIds).toEqual(expect.arrayContaining(["start", "end", "a", "b"]))

    // Assert entry edge and handoff edge, and leaf attaches to end
    const pairs = edges.map(e => `${e.source}->${e.target}`)
    expect(pairs).toEqual(expect.arrayContaining(["start->a", "a->b", "b->end"]))
  })
})
