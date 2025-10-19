import { getCoreConfig } from "@core/core-config/coreConfig"
import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import { getSelfImprovePrompt } from "@core/improvement/behavioral/self-improve/node/selfImprovement.p"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import type { WorkFlowNode } from "@core/node/WorkFlowNode"
import { AgentSelfImprovementOutputSchema } from "@core/node/schemas/restrictedAgent"
import { saveInLoc } from "@core/utils/fs/fileSaver"
import { lgg } from "@core/utils/logging/Logger" // src/core/node/improve/function.ts
import type { WorkflowConfig, WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import type { IPersistence } from "@lucky/adapter-supabase"
const config = getCoreConfig()

export async function selfImproveHelper({
  n,
  fitness,
  workflowInvocationId,
  setup,
  goal,
  persistence,
}: {
  n: WorkFlowNode
  fitness: FitnessOfWorkflow
  workflowInvocationId: string
  setup: WorkflowConfig
  goal: string
  persistence?: IPersistence
}): Promise<{ config: WorkflowNodeConfig; usdCost: number }> {
  const nodeConfig = setup.nodes.find(node => node.nodeId === n.nodeId)
  if (!nodeConfig) {
    throw new Error(`Workflow node ${n.nodeId} not found in selfImproveHelper`)
  }

  // use summaries instead of raw transcript when enabled
  let executionData: string

  if (config.improvement.flags.useSummariesForImprovement) {
    try {
      if (!persistence) {
        lgg.warn(`no persistence adapter available for node ${n.nodeId}, skipping summaries`)
        executionData = "no execution data"
      } else {
        const summaries = await persistence.nodes.retrieveNodeSummaries(workflowInvocationId)
        const nodeSummaries = summaries.filter(s => s.nodeId === n.nodeId)

        if (nodeSummaries.length > 0) {
          // format summaries for the prompt
          executionData = nodeSummaries
            .map((s, idx: number) => {
              const summary = s.summary || "no summary available"
              return `execution ${idx + 1}:\n- summary: ${summary}`
            })
            .join("\n\n")

          lgg.log(`using ${nodeSummaries.length} summaries for node ${n.nodeId} improvement`)
        } else {
          lgg.warn(`no summaries found for node ${n.nodeId}, falling back to runtime store`)
          executionData = "no execution data"
        }
      }
    } catch (error) {
      lgg.error(`failed to retrieve summaries for node ${n.nodeId}:`, error)
      executionData = "no execution data"
    }
  } else {
    // use raw transcript from runtime store (original behavior)
    executionData = "no transcript"
  }

  const prompt = getSelfImprovePrompt({
    nodeConfig,
    transcript: executionData,
    _memory: n.getMemory(),
    _fitness: fitness,
    goal,
    feedback: "no feedback",
  })

  lgg.log("🔄 improving workflow node ", n.nodeId)
  const { data, success, error, usdCost } = await sendAI({
    messages: [{ role: "user", content: prompt }],
    model: n.getModelName(),
    mode: "structured",
    schema: AgentSelfImprovementOutputSchema,
  })

  if (!success) {
    lgg.error("🔴 error improving workflow node", n.nodeId, error)
    if (error.includes("invalid_type")) {
      lgg.error("🔴 Memory format error: Received array instead of object. Check AI response format.")
    }
    throw new Error(error)
  }

  const { updated_node_config, learn_points, improve_points } = data

  // sanity‐check memory shape
  if (updated_node_config.memory && Array.isArray(updated_node_config.memory)) {
    lgg.error("🔴 Memory validation error: Memory is an array but should be an object")
    updated_node_config.memory = {}
  }

  saveInLoc(
    `${config.paths.node.logging}/learn/self_improvement_${n.nodeId}_${new Date().toISOString()}.json`,
    JSON.stringify({ updated_node_config, learn_points, improve_points, usdCost }, null, 2),
  )

  // update the node config
  const finalNodeConfig = {
    ...nodeConfig,
    ...updated_node_config,
  }

  return { config: finalNodeConfig as WorkflowNodeConfig, usdCost }
}
