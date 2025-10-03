import { getDefaultModels } from "@core/core-config/compat"
import type { AggregatedPayload } from "@core/messages/MessagePayload"
import { WorkFlowNode } from "@core/node/WorkFlowNode"
// TODO: Refactor test to use adapter pattern
// import { Messages } from "@core/utils/persistence/message/main"
// import { retrieveNodeInvocationSummaries } from "@core/utils/persistence/node/retrieveNodeSummaries"
// import { saveNodeVersionToDB } from "@core/utils/persistence/node/saveNode"
// import { saveNodeInvocationToDB } from "@core/utils/persistence/node/saveNodeInvocation"
import { createWorkflowVersion, ensureWorkflowExists } from "@core/utils/persistence/workflow/registerWorkflow"
import { Workflow } from "@core/workflow/Workflow"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { beforeAll, describe, expect, it, vi } from "vitest"

// Copy of core/src/examples/setup/setupfile.json placed inline for test isolation
const recipeAggregationConfig: WorkflowConfig = {
  nodes: [
    {
      nodeId: "start-recipe-aggregation",
      description: "Entry node that receives a user request to aggregate three recipes into one combined recipe.",
      systemPrompt:
        "You are an assistant that understands the user's request to combine three different recipes into one aggregated recipe. Identify the recipes and prepare to fetch their details.",
      modelName: getDefaultModels().nano,
      mcpTools: [],
      codeTools: [],
      handOffs: ["fetch-recipe-1", "fetch-recipe-2", "fetch-recipe-3"],
      handOffType: "parallel",
    },
    {
      nodeId: "fetch-recipe-1",
      description: "Fetch details of the first recipe to be aggregated.",
      systemPrompt:
        "Fetch and extract the full details of the first recipe including ingredients, steps, and cooking time.",
      modelName: getDefaultModels().nano,
      mcpTools: [],
      codeTools: [],
      handOffs: ["aggregate-recipes"],
    },
    {
      nodeId: "fetch-recipe-2",
      description: "Fetch details of the second recipe to be aggregated.",
      systemPrompt:
        "Fetch and extract the full details of the second recipe including ingredients, steps, and cooking time.",
      modelName: getDefaultModels().nano,
      mcpTools: [],
      codeTools: [],
      handOffs: ["aggregate-recipes"],
    },
    {
      nodeId: "fetch-recipe-3",
      description: "Fetch details of the third recipe to be aggregated.",
      systemPrompt:
        "Fetch and extract the full details of the third recipe including ingredients, steps, and cooking time.",
      modelName: getDefaultModels().nano,
      mcpTools: [],
      codeTools: [],
      handOffs: ["aggregate-recipes"],
    },
    {
      nodeId: "aggregate-recipes",
      description:
        "Aggregate the three fetched recipes into one combined recipe, merging ingredients and steps logically.",
      systemPrompt:
        "Combine the three recipes into one aggregated recipe. Merge ingredients lists, unify cooking steps, and optimize the recipe for clarity and efficiency.",
      modelName: getDefaultModels().nano,
      mcpTools: [],
      codeTools: [],
      handOffs: ["end"],
      waitFor: ["fetch-recipe-1", "fetch-recipe-2", "fetch-recipe-3"],
    },
  ],
  entryNodeId: "start-recipe-aggregation",
}

describe.skip("Aggregate waitFor integration (recipe config)", () => {
  // TODO: Refactor test to use adapter pattern
  beforeAll(() => {
    // vi.spyOn(Messages, "save").mockResolvedValue()
    // vi.spyOn(Messages, "update").mockResolvedValue()
  })

  it("invokes the aggregate node exactly once and receives 3 upstream payloads", async () => {
    type InvokeArgs = Parameters<WorkFlowNode["invoke"]>[0]
    const callArgsByNode: Record<string, InvokeArgs[]> = {}

    // Stub WorkFlowNode.create to avoid real tool init/LLM calls; preserve handoffs from config
    vi.spyOn(WorkFlowNode, "create").mockImplementation(async config => {
      const nodeId = config.nodeId
      const mkReply = (text: string) => ({
        kind: "result" as const,
        berichten: [{ type: "text", text }],
      })
      const persistence = undefined
      return {
        nodeId,
        toConfig: () => config,
        invoke: async (args: InvokeArgs) => {
          if (!callArgsByNode[nodeId]) callArgsByNode[nodeId] = []
          callArgsByNode[nodeId].push(args)

          const base = {
            nodeInvocationId: `${nodeId}-inv-1`,
            usdCost: 0,
            agentSteps: [],
            updatedMemory: undefined,
            error: undefined,
            summaryWithInfo: {
              timestamp: Date.now(),
              nodeId,
              summary: `${nodeId} ok`,
            },
          }

          // Follow handOffs from config
          const nodeCfg = recipeAggregationConfig.nodes.find(n => n.nodeId === nodeId)!
          const nextIds = nodeCfg.handOffs

          // Persist a NodeInvocation record to DB to match real pipeline behavior
          const finalOutput = `${nodeId} done`
          // await persistence?.nodes.saveNodeInvocation({
          //   nodeId,
          //   start_time: new Date().toISOString(),
          //   messageId: args.workflowMessageIncoming.messageId,
          //   usdCost: 0,
          //   output: finalOutput,
          //   workflowInvocationId: args.workflowInvocationId,
          //   agentSteps: [],
          //   summary: `${nodeId} ok`,
          //   files: [],
          //   workflowVersionId: args.workflowVersionId,
          //   model: nodeCfg.modelName,
          // })

          return {
            ...base,
            nodeInvocationFinalOutput: finalOutput,
            replyMessage: mkReply(finalOutput),
            nextIds,
            outgoingMessages: [],
          }
        },
      } as unknown as WorkFlowNode
    })

    const evaluation = {
      type: "text" as const,
      goal: "Aggregate the recipes",
      question: "Combine three recipes into one",
      answer: "",
      workflowId: `aggregate-recipes-it-${Date.now()}`,
    }

    // Persist Workflow + NodeVersion rows so NodeInvocation FKs are satisfied
    const wfVersionId = `wf_ver_${Date.now()}`
    await ensureWorkflowExists(undefined, "Aggregate waitFor test", evaluation.workflowId)
    await createWorkflowVersion({
      persistence: undefined,
      workflowVersionId: wfVersionId,
      workflowConfig: recipeAggregationConfig,
      commitMessage: "aggregate-waitfor",
      workflowId: evaluation.workflowId,
    })
    // TODO: Refactor to use adapter pattern
    // for (const node of recipeAggregationConfig.nodes) {
    //   await saveNodeVersionToDB({
    //     config: node,
    //     workflowVersionId: wfVersionId,
    //   })
    // }

    const wf = Workflow.create({
      config: recipeAggregationConfig,
      evaluationInput: evaluation,
      toolContext: undefined,
      workflowVersionId: wfVersionId,
    })

    await wf.prepareWorkflow(evaluation, "none")

    const { success, data: results, error } = await wf.run()
    expect(success).toBe(true)
    expect(error).toBeUndefined()
    expect(results?.length).toBeGreaterThan(0)

    // Ensure aggregate node invoked exactly once
    const aggInvocations = callArgsByNode["aggregate-recipes"] ?? []
    expect(aggInvocations.length).toBe(1)

    // Validate aggregated payload contains 3 upstream messages
    const incoming = aggInvocations[0].workflowMessageIncoming
    const payload = incoming.payload as AggregatedPayload
    expect(payload.kind).toBe("aggregated")
    expect(payload.messages.length).toBe(3)
    const fromIds = payload.messages.map(m => m.fromNodeId).sort()
    expect(fromIds).toEqual(["fetch-recipe-1", "fetch-recipe-2", "fetch-recipe-3"].sort())

    // Sanity: upstream nodes each invoked once; start invoked once
    expect((callArgsByNode["start-recipe-aggregation"] ?? []).length).toBe(1)
    expect((callArgsByNode["fetch-recipe-1"] ?? []).length).toBe(1)
    expect((callArgsByNode["fetch-recipe-2"] ?? []).length).toBe(1)
    expect((callArgsByNode["fetch-recipe-3"] ?? []).length).toBe(1)

    // DB-level verification: count NodeInvocation rows for this workflow invocation
    const wfInvocationId = results![0].workflowInvocationId
    // const summaries = await retrieveNodeInvocationSummaries(wfInvocationId)
    // // We expect exactly one DB record per invoked node (5 nodes in this config)
    // expect(summaries.length).toBe(recipeAggregationConfig.nodes.length)
    // expect(summaries.length).toBe(5)
  }, 5_000)
})
