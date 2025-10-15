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
vi.mock("@lucky/examples/settings/constants.client", () => ({
  MODELS: { default: "openrouter#openai/gpt-4o-mini" },
}))

describe("workflow-data normalization", () => {
  it("accepts canonical config without edges array", () => {
    const canonical = {
      nodes: [
        {
          nodeId: "n1",
          description: "",
          systemPrompt: "",
          modelName: MODELS.default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["n2"],
          memory: {},
        },
        {
          nodeId: "n2",
          description: "",
          systemPrompt: "",
          modelName: MODELS.default,
          mcpTools: [],
          codeTools: [],
          handOffs: [],
          memory: {},
        },
      ],
      entryNodeId: "n1",
    } satisfies WorkflowConfig
    const parsed = toWorkflowConfig(canonical)!
    const { edges } = initialSetupConfig(parsed)
    const pairs = edges.map(e => `${e.source}->${e.target}`)
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
          modelName: MODELS.default,
          mcpTools: [],
          codeTools: [],
          handOffs: [],
          memory: {},
        },
      ],
      entryNodeId: "x",
    } satisfies WorkflowConfig
    const parsed = toWorkflowConfig(canonical)!
    const { edges } = initialSetupConfig(parsed)
    const pairs = edges.map(e => `${e.source}->${e.target}`)
    expect(pairs).toContain("start->x")
    expect(pairs).toContain("x->end")
  })
})
